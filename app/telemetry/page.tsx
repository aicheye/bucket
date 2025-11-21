import { getServerSession } from "next-auth/next";
import { executeHasuraAdminQuery } from "../../lib/hasura";
import authOptions from "../../lib/nextauth";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import { DauChart, FeatureDailyMultiLine } from "./TelemetryCharts";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default async function TelemetryPage() {
    const session = await getServerSession(authOptions);

    if (!session) return <div>Unauthorized</div>;

    const adminId = process.env.TELEMETRY_ADMIN_ID;
    if (!adminId || String(session.user?.id) !== String(adminId)) {
        return <div>Unauthorized</div>;
    }

    // Queries from user request
    const GET_DAU = `query GetTelemetryDau { telemetry_dau { dau day } }`;
    const GET_FEATURE_30D = `query GetTelemetryFeatureUsage30d { telemetry_feature_usage_30d { event_count_30d unique_users_30d event } }`;
    const GET_FEATURE_DAILY = `query GetTelemetryFeatureUsageDaily { telemetry_feature_usage_daily { event_count unique_users day event } }`;
    const GET_MAU = `query GetTelemetryMau30d { telemetry_mau_30d { mau_30d } }`;

    const [dauRes, feat30Res, featDailyRes, mauRes] = await Promise.all([
        executeHasuraAdminQuery(GET_DAU, {}, session.user.id),
        executeHasuraAdminQuery(GET_FEATURE_30D, {}, session.user.id),
        executeHasuraAdminQuery(GET_FEATURE_DAILY, {}, session.user.id),
        executeHasuraAdminQuery(GET_MAU, {}, session.user.id),
    ]);

    const daus = (dauRes?.data?.telemetry_dau || []).slice().sort((a: any, b: any) => new Date(a.day).getTime() - new Date(b.day).getTime());
    const feature30 = feat30Res?.data?.telemetry_feature_usage_30d || [];
    const featureDaily = featDailyRes?.data?.telemetry_feature_usage_daily || [];
    const mau = mauRes?.data?.telemetry_mau_30d?.[0]?.mau_30d || 0;

    // Build line chart points
    const dauPoints = daus.map((d: any, i: number) => [i, d.dau]);

    // Group featureDaily by event
    const grouped: Record<string, Array<any>> = {};
    for (const r of featureDaily) {
        grouped[r.event] = grouped[r.event] || [];
        grouped[r.event].push(r);
    }
    // Sort each event by day so the line graphs show time-ordered points
    for (const k of Object.keys(grouped)) {
        grouped[k].sort((a: any, b: any) => new Date(a.day).getTime() - new Date(b.day).getTime());
    }

    // For display, pick top 4 features
    feature30.sort((a: any, b: any) => b.event_count_30d - a.event_count_30d);
    const topFeatures = feature30.slice(0, 10);
    const topEvents = topFeatures.map((f: any) => f.event);
    // Only keep grouped data for top events to avoid an overly noisy chart.
    const groupedTop: Record<string, any> = {};
    for (const k of topEvents) {
        groupedTop[k] = grouped[k] || [];
    }

    const latestDau = daus.length ? daus[daus.length - 1].dau : 0;

    return (
        <div className="flex flex-col min-h-screen bg-base-300">
            <Navbar />
            <main className="flex-1 p-8 max-w-7xl mx-auto space-y-8 w-full">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Telemetry</h1>
                    <div className="badge badge-primary badge-lg">
                        <FontAwesomeIcon icon={faLock} />
                        Admin View
                    </div>
                </div>

                {/* Metrics */}
                <div className="stats shadow w-full bg-base-100">
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
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">User Growth (DAU)</h2>
                            <DauChart data={daus.map((d: any) => ({ day: d.day, dau: d.dau }))} />
                        </div>
                    </div>
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Feature Usage Trends</h2>
                            <FeatureDailyMultiLine grouped={groupedTop} />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card bg-base-100 shadow-xl overflow-hidden">
                    <div className="card-body p-0">
                        <div className="p-6 bg-base-200">
                            <h2 className="card-title">Most Used Features (30 Days)</h2>
                        </div>
                        <div className="overflow-x-auto p-6">
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
                                        {topFeatures.map((it: any) => (
                                            <tr key={it.event}>
                                                <td className="font-medium">{it.event}</td>
                                                <td className="text-right">{it.event_count_30d.toLocaleString()}</td>
                                                <td className="text-right">{it.unique_users_30d.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
