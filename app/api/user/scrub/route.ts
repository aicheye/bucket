import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { SCRUB_USER } from "../../../../lib/graphql/mutations";
import { executeHasuraQuery } from "../../../../lib/hasura";
import { logger } from "../../../../lib/logger";
import authOptions from "../../../../lib/nextauth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    logger.info("Scrubbing user data", { userId: session.user.id });

    // Set PII fields to null and mark anonymous mode + disable telemetry
    const res = await executeHasuraQuery(
      SCRUB_USER,
      { id: session.user.id },
      session.user.id,
    );

    if (res?.errors) {
      logger.error("Error scrubbing user:", {
        errors: res.errors,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "Scrub failed" }, { status: 500 });
    }

    logger.info("User scrubbed successfully", { userId: session.user.id });
    return NextResponse.json({ scrubbed: true }, { status: 200 });
  } catch (err) {
    logger.error("Scrub route error:", { error: err });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
