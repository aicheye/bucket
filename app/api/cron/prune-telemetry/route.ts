import { NextResponse } from "next/server";
import { DELETE_OLD_TELEMETRY } from "../../../../lib/graphql/mutations";
import { executeHasuraAdminQuery } from "../../../../lib/hasura";
import { logger } from "../../../../lib/logger";

async function pruneTelemetry(request: Request) {
  logger.info("Starting telemetry prune cron job");
  // Check for CRON_SECRET if configured
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn("Unauthorized attempt to prune telemetry");
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString();

  try {
    const result = await executeHasuraAdminQuery(
      DELETE_OLD_TELEMETRY,
      { cutoff },
      "system-cron",
    );

    const deletedCount = result?.data?.delete_telemetry?.affected_rows || 0;
    logger.info("Telemetry prune completed", { deletedCount, cutoff });

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      cutoff,
    });
  } catch (error) {
    logger.error("Prune telemetry error:", { error });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return pruneTelemetry(request);
}

export async function POST(request: Request) {
  return pruneTelemetry(request);
}
