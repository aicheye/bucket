"use client";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

type DauPoint = { day: string; dau: number };
type FeatureDaily = { event: string; event_count: number; unique_users: number; day: string };

export function DauChart({ data }: { data: DauPoint[] }) {
    return (
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-content)" strokeOpacity={0.2} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-base-content)" }} />
                    <YAxis tick={{ fill: "var(--color-base-content)" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--color-base-200)",
                            color: "var(--color-base-content)",
                            borderColor: "var(--color-base-200)"
                        }}
                        itemStyle={{ color: "var(--color-base-content)" }}
                        labelStyle={{ color: "var(--color-base-content)" }}
                    />
                    <Line type="monotone" dataKey="dau" name="DAU" stroke="var(--color-primary)" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function FeatureDailyMultiLine({ grouped }: { grouped: Record<string, FeatureDaily[]> }) {
    // Convert grouped map into a combined series keyed by day where each top-level key is event
    const events = Object.keys(grouped);
    const days = new Set<string>();
    events.forEach((evt) => grouped[evt].forEach((r) => days.add(r.day)));
    const sortedDays = Array.from(days).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const seriesData = sortedDays.map((day) => {
        const row: any = { day };
        for (const evt of events) {
            const found = grouped[evt].find((d) => d.day === day);
            row[evt] = found ? found.event_count : 0;
        }
        return row;
    });

    const colors = [
        "#ef4444", // red-500
        "#f97316", // orange-500
        "#f59e0b", // amber-500
        "#eab308", // yellow-500
        "#84cc16", // lime-500
        "#22c55e", // green-500
        "#10b981", // emerald-500
        "#14b8a6", // teal-500
        "#06b6d4", // cyan-500
        "#0ea5e9", // sky-500
        "#3b82f6", // blue-500
        "#6366f1", // indigo-500
        "#8b5cf6", // violet-500
        "#a855f7", // purple-500
        "#d946ef", // fuchsia-500
        "#ec4899", // pink-500
        "#f43f5e", // rose-500
    ];

    return (
        <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
                <LineChart data={seriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-content)" strokeOpacity={0.2} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-base-content)" }} />
                    <YAxis tick={{ fill: "var(--color-base-content)" }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--color-base-200)",
                            color: "var(--color-base-content)",
                            borderColor: "var(--color-base-200)"
                        }}
                        itemStyle={{ color: "var(--color-base-content)" }}
                        labelStyle={{ color: "var(--color-base-content)" }}
                    />
                    <Legend wrapperStyle={{ color: "var(--color-base-content)" }} />
                    {events.map((evt, i) => (
                        <Line key={evt} type="monotone" dataKey={evt} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

