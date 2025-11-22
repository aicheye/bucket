import { NextResponse } from "next/server";
import { executeHasuraAdminQuery } from "../../../../lib/hasura";

async function pruneTelemetry(request: Request) {
  // Check for CRON_SECRET if configured
  if (process.env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString();

  const DELETE_OLD_TELEMETRY = `
        mutation DeleteOldTelemetry($cutoff: timestamptz!) {
            delete_telemetry(where: { created_at: { _lt: $cutoff } }) {
                affected_rows
            }
        }
    `;

  try {
    const result = await executeHasuraAdminQuery(
      DELETE_OLD_TELEMETRY,
      { cutoff },
      "system-cron",
    );

    const deletedCount = result?.data?.delete_telemetry?.affected_rows || 0;

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      cutoff,
    });
  } catch (error) {
    console.error("Prune telemetry error:", error);
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
