"use client";

import { faSnowflake } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSnow } from "../../contexts/SnowContext";

export default function SnowToggle() {
  const { isSnowEnabled, toggleSnow } = useSnow();

  return (
    <label className="swap swap-rotate btn btn-ghost btn-circle text-base-content" title="Toggle snow effect">
      <input type="checkbox" checked={isSnowEnabled} onChange={toggleSnow} />

      {/* snow on */}
      <div className="swap-on">
        <FontAwesomeIcon icon={faSnowflake} className="w-5 h-5" />
      </div>

      {/* snow off */}
      <div className="swap-off">
        <FontAwesomeIcon icon={faSnowflake} className="w-5 h-5 opacity-30" />
      </div>
    </label>
  );
}
