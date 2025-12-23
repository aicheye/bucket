import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { INSERT_TELEMETRY } from "../../../lib/graphql/mutations";
import { COUNT_RECENT_TELEMETRY, GET_USER, LAST_TELEMETRY } from "../../../lib/graphql/queries";
import {
  executeHasuraAdminQuery,
  executeHasuraQuery,
} from "../../../lib/hasura";
import { logger } from "../../../lib/logger";
import authOptions from "../../../lib/nextauth";

const DEFAULT_RATE_LIMIT_MINUTES = 15;
const GLOBAL_RATE_LIMIT_WINDOW_MINUTES = 5;
const GLOBAL_RATE_LIMIT_MAX_EVENTS = 30;

function hmacHex(secret: string, value: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(value))
    .digest("hex");
}

function sanitizeProperties(props: Record<string, unknown>) {
  if (!props || typeof props !== "object") return {};

  const disallowed = [
    "email",
    "name",
    "firstName",
    "lastName",
    "image",
    "profile",
    "picture",
  ]; // drop PII
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(props)) {
    const lower = key.toLowerCase();
    if (disallowed.includes(lower)) continue;

    // Keep small primitives
    const v = props[key];
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null
    ) {
      sanitized[key] = v;
    }
  }

  return sanitized;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.TELEMETRY_SECRET) {
      logger.error("TELEMETRY_SECRET not configured");
      return NextResponse.json(
        { error: "Telemetry disabled" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const event = String(body?.event || "").trim();
    const properties = body?.properties || {};

    if (!event)
      return NextResponse.json({ error: "Missing event" }, { status: 400 });

    // Whitelist of valid events -- only these will be recorded
    const VALID_EVENTS = [
      "session_heartbeat",
      "view_course",
      "view_grades",
      "toggle_sections",
      "select_sections",
      "save_sections",
      "toggle_marking_schemes",
      "add_component",
      "remove_component",
      "save_marking_scheme",
      "toggle_theme",
      "create_item",
      "delete_item",
      "edit_item",
      "parse_outline",
      "delete_course",
      "parse_grades",
      "create_placeholder",
      "edit_grading_settings",
      "set_goal",
      "set_term_goal",
      "view_term_dashboard",
      "update_course_credits",
      "select_marking_scheme",
      "import_transcript",
      "set_official_grade",
      "set_bonus",
    ];

    // Reject invalid events
    if (!VALID_EVENTS.includes(event)) {
      logger.warn("Invalid telemetry event rejected", {
        event,
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Invalid event", event },
        { status: 400 },
      );
    }

    // Anonymize user id server-side
    const anon = hmacHex(process.env.TELEMETRY_SECRET, String(session.user.id));

    // Sanitize properties and optionally hash course id
    const sanitized = sanitizeProperties(properties);
    if (sanitized.course_id) {
      // Replace with non-reversible hash
      sanitized.course_hash = hmacHex(
        process.env.TELEMETRY_SECRET,
        String(sanitized.course_id),
      );
      delete sanitized.course_id;
    }

    // Check user telemetry consent
    const consentRes = await executeHasuraQuery(
      GET_USER,
      { id: session.user.id },
      session.user.id,
    );
    const consent = consentRes?.data?.users_by_pk?.telemetry_consent;
    if (consent === false) {
      // User opted out
      return NextResponse.json(
        { inserted: false, reason: "opt_out" },
        { status: 200 },
      );
    }

    // Global rate limit: prevent too many events from the same user in a short window
    const globalLimitSince = new Date(
      Date.now() - GLOBAL_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();
    const countRes = await executeHasuraAdminQuery(
      COUNT_RECENT_TELEMETRY,
      { anon, since: globalLimitSince },
      session.user.id,
    );
    const recentCount = countRes?.data?.telemetry_aggregate?.aggregate?.count || 0;
    if (recentCount >= GLOBAL_RATE_LIMIT_MAX_EVENTS) {
      logger.warn("Global telemetry rate limit exceeded", {
        userId: session.user.id,
        count: recentCount,
        window: GLOBAL_RATE_LIMIT_WINDOW_MINUTES,
      });
      return NextResponse.json(
        { inserted: false, reason: "rate_limit_exceeded" },
        { status: 429 },
      );
    }

    // Rate-limit identical events from the same user in a short window
    // Use a shorter window for session heartbeats to avoid spamming (10 minutes),
    // but keep the default for other events.
    const eventRateLimitMinutes =
      event === "session_heartbeat" ? 10 : DEFAULT_RATE_LIMIT_MINUTES;
    const since = new Date(
      Date.now() - eventRateLimitMinutes * 60 * 1000,
    ).toISOString();
    const checkRes = await executeHasuraAdminQuery(
      LAST_TELEMETRY,
      { anon, event, since },
      session.user.id,
    );
    if (checkRes?.data?.telemetry?.length > 0) {
      return NextResponse.json(
        { inserted: false, reason: "rate_limited" },
        { status: 200 },
      );
    }

    // Insert telemetry row
    // Some Hasura setups don't expose 'returning' in insert responses for this table.
    // Use affected_rows instead for compatibility.
    const variables = {
      objects: [
        {
          anon_user_hash: anon,
          event: event,
          properties: JSON.stringify(sanitized),
          created_at: new Date().toISOString(),
        },
      ],
    };

    const insertRes = await executeHasuraQuery(
      INSERT_TELEMETRY,
      variables,
      session.user.id,
    );
    if (
      insertRes?.errors ||
      !insertRes?.data?.insert_telemetry?.affected_rows
    ) {
      logger.error("GraphQL insert telemetry error:", {
        errors: insertRes.errors,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    logger.debug("Telemetry event recorded", {
      event: event,
      userId: session.user.id,
    });
    return NextResponse.json({ inserted: true }, { status: 201 });
  } catch (error) {
    logger.error("Telemetry route error:", { error });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
