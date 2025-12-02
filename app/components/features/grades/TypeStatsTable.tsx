import { getCategoryColor } from "../../../contexts/CourseContext";

interface TypeStat {
  category: string;
  compWeight: number;
  keptCount: number;
  averagePercent: number | null;
  earnedContributionSum: number | null;
  totalComponent: number;
  markedCount: number;
  remainingCount: number;
  itemsCount: number;
}

interface Props {
  stats: TypeStat[];
  getCourseTypes: () => string[];
  showRemaining: boolean;
}

export default function TypeStatsTable({
  stats,
  getCourseTypes,
  showRemaining,
}: Props) {
  return (
    <div className="overflow-x-auto border border-base-content/10 rounded-box">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="text-right">Avg Grade</th>
            <th className="text-right">Contribution</th>
            <th className="w-full">Type</th>
            <th>Marked</th>
            {showRemaining && <th>Remaining</th>}
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.category}>
              <td className="text-right">
                {s.averagePercent === null ? (
                  <span className="text-base-content/50">-</span>
                ) : (
                  <span className="font-mono font-bold">
                    {s.averagePercent.toFixed(2)}%
                  </span>
                )}
              </td>
              <td className="text-right">
                {s.earnedContributionSum === null ? (
                  <span className="text-base-content/50">
                    / {s.totalComponent.toFixed(2)}%
                  </span>
                ) : (
                  <div className="flex flex-col items-end">
                    {s.earnedContributionSum - s.totalComponent < -0.005 ? (
                      <span className="font-mono font-bold">
                        {(s.earnedContributionSum - s.totalComponent).toFixed(
                          2,
                        )}
                        %
                      </span>
                    ) : (
                      <span className="font-mono opacity-50">
                        {s.earnedContributionSum.toFixed(2)}%
                      </span>
                    )}
                    <span className="text-xs opacity-50">
                      / {s.totalComponent.toFixed(2)}%
                    </span>
                  </div>
                )}
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div
                    className={`badge badge-xs ${getCategoryColor(s.category, getCourseTypes())}`}
                  ></div>
                  <span className="font-medium">{s.category}</span>
                </div>
              </td>
              <td>
                <span className="font-mono">{s.markedCount}</span>
              </td>
              {showRemaining && (
                <td>
                  <span className="font-mono">{s.remainingCount}</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
