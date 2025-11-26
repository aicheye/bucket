import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon as FaIcon } from "@fortawesome/react-fontawesome";

export default function ReqAvgBadge({
  requiredAverage,
  average,
  showTooltip = true,
}: {
  requiredAverage: number;
  average: number;
  showTooltip?: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={`border-none peer flex gap-2 items-center ${requiredAverage > 100 ? "bg-error/50 text-error-content" : requiredAverage < 0 ? "bg-success/50 text-success-content" : requiredAverage < average ? "bg-info/50 text-info-content" : "bg-warning/50 text-warning-content"} badge badge-lg ${showTooltip && "cursor-help"}`}
      >
        <FaIcon icon={faInfoCircle} className="text-xs opacity-80" />
        <span className="uppercase tracking-wider text-xs font-bold opacity-80">
          Req. Avg
        </span>
        <span
          className={`font-bold text-xs ${requiredAverage > 100 ? "text-error-content" : requiredAverage < 0 ? "text-success-content" : requiredAverage < average ? "text-info-content" : "text-warning-content"}`}
        >
          {requiredAverage.toFixed(1)}%
        </span>
      </div>
      {showTooltip && (
        <div className="z-[3] absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden peer-hover:block z-50 w-48 p-3 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/5">
          <div className="font-bold mb-2 border-b border-base-content/10 pb-1">
            Legend
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span>Goal Achieved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-info"></div>
              <span>On Track</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <span>Off Track</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-error"></div>
              <span>Impossible (&gt;100%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
