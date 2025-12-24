import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon as FaIcon } from "@fortawesome/react-fontawesome";

export default function ReqOfficialBadge({
  requiredAverage,
}: {
  requiredAverage: number;
}) {
  return (
    <div className="relative">
      <div className="border-none flex gap-2 items-center bg-base-300 text-base-content badge badge-lg opacity-80">
        <FaIcon
          icon={faInfoCircle}
          className="text-xs opacity-70"
          aria-hidden="true"
        />
        <span className="uppercase tracking-wider text-xs font-bold opacity-70">
          Req. Avg
        </span>
        <span className="font-bold text-xs">{requiredAverage.toFixed(1)}%</span>
      </div>
    </div>
  );
}
