import { faLock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { APP_NAME } from "../../../lib/constants";
import {
  GET_TELEMETRY_DAU,
  GET_TELEMETRY_FEATURE_USAGE_30D,
  GET_TELEMETRY_FEATURE_USAGE_DAILY,
  GET_TELEMETRY_MAU_30D,
} from "../../../lib/graphql/queries";
import { executeHasuraAdminQuery } from "../../../lib/hasura";
import authOptions from "../../../lib/nextauth";
import Table from "../../components/ui/Table";
import { DauChart, FeatureDailyMultiLine } from "./telemetry-charts";
import { forbidden, unauthorized } from "next/navigation";

interface TelemetryDau {
  dau: number;
  day: string;
}

interface TelemetryFeatureUsage30d {
  event_count_30d: number;
  unique_users_30d: number;
  event: string;
}

interface TelemetryFeatureUsageDaily {
  event_count: number;
  unique_users: number;
  day: string;
  event: string;
}

export default async function TelemetryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    unauthorized();
  }

  const adminId = process.env.TELEMETRY_ADMIN_ID;
  if (!adminId || String(session.user?.id) !== String(adminId)) {
    forbidden();
  }

  const [dauRes, feat30Res, featDailyRes, mauRes] = await Promise.all([
    executeHasuraAdminQuery(GET_TELEMETRY_DAU, {}, session.user.id),
    executeHasuraAdminQuery(
      GET_TELEMETRY_FEATURE_USAGE_30D,
      {},
      session.user.id,
    ),
    executeHasuraAdminQuery(
      GET_TELEMETRY_FEATURE_USAGE_DAILY,
      {},
      session.user.id,
    ),
    executeHasuraAdminQuery(GET_TELEMETRY_MAU_30D, {}, session.user.id),
  ]);

  const daus: TelemetryDau[] = (dauRes?.data?.telemetry_dau || [])
    .slice()
    .sort(
      (a: TelemetryDau, b: TelemetryDau) =>
        new Date(a.day).getTime() - new Date(b.day).getTime(),
    );
  const feature30: TelemetryFeatureUsage30d[] =
    feat30Res?.data?.telemetry_feature_usage_30d || [];
  const featureDaily: TelemetryFeatureUsageDaily[] =
    featDailyRes?.data?.telemetry_feature_usage_daily || [];
  const mau = mauRes?.data?.telemetry_mau_30d?.[0]?.mau_30d || 0;

  // Group featureDaily by event
  const grouped: Record<string, Array<TelemetryFeatureUsageDaily>> = {};
  for (const r of featureDaily) {
    grouped[r.event] = grouped[r.event] || [];
    grouped[r.event].push(r);
  }
  // Sort each event by day so the line graphs show time-ordered points
  for (const k of Object.keys(grouped)) {
    grouped[k].sort(
      (a: TelemetryFeatureUsageDaily, b: TelemetryFeatureUsageDaily) =>
        new Date(a.day).getTime() - new Date(b.day).getTime(),
    );
  }

  // For display, pick top 4 features
  feature30.sort(
    (a: TelemetryFeatureUsage30d, b: TelemetryFeatureUsage30d) =>
      b.event_count_30d - a.event_count_30d,
  );
  const topFeatures = feature30;
  const topEvents = topFeatures.map((f: TelemetryFeatureUsage30d) => f.event);
  // Only keep grouped data for top events to avoid an overly noisy chart.
  const groupedTop: Record<string, TelemetryFeatureUsageDaily[]> = {};
  for (const k of topEvents) {
    groupedTop[k] = grouped[k] || [];
  }

  const latestDau = daus.length ? daus[daus.length - 1].dau : 0;

  return (
    <div className="flex flex-col min-h-screen bg-base-300">
      <main className="flex-1 p-8 max-w-7xl mx-auto space-y-8 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Telemetry</h1>
          <div className="badge badge-secondary badge-lg">
            <FontAwesomeIcon icon={faLock} aria-hidden="true" />
            Admin View
          </div>
        </div>

        {/* Metrics */}
        <div className="stats shadow-sm w-full bg-base-100">
          <div className="stat">
            <div className="stat-title">Monthly Active Users</div>
            <div className="stat-value">{mau}</div>
            <div className="stat-desc">30 day rolling window</div>
          </div>
          <div className="stat">
            <div className="stat-title">Daily Active Users</div>
            <div className="stat-value">{latestDau}</div>
            <div className="stat-desc">Latest recorded day</div>
          </div>
        </div>

        {/* Charts */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">User Growth (DAU)</h2>
            <DauChart
              data={daus.map((d: TelemetryDau) => ({ day: d.day, dau: d.dau }))}
            />
          </div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title">Feature Usage Trends</h2>
            <FeatureDailyMultiLine grouped={groupedTop} />
          </div>
        </div>

        {/* Table */}
        <Table className="card bg-base-100 shadow-sm">
          <div className="card-body flex flex-col gap-4">
            <h2 className="card-title">Most Used Features (30 Days)</h2>
            <div className="overflow-x-auto">
              <div className="card overflow-x-auto border border-base-300 shadow-none">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th className="text-right">Total Events</th>
                      <th className="text-right">Unique Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFeatures.map((it: TelemetryFeatureUsage30d) => (
                      <tr key={it.event}>
                        <td className="font-medium">{it.event}</td>
                        <td className="text-right">
                          {it.event_count_30d.toLocaleString()}
                        </td>
                        <td className="text-right">
                          {it.unique_users_30d.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Table>
      </main>
    </div>
  );
}

export const metadata: Metadata = {
  title: `${APP_NAME} | Telemetry`,
};
