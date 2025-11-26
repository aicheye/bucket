export default function RangeBadge({
  rangeMin,
  rangeMax,
}: {
  rangeMin: number;
  rangeMax: number;
}) {
  return (
    <div className="relative">
      <div className="peer flex gap-2 items-center bg-secondary/70 badge badge-lg border-none">
        <div className="flex gap-2 items-center justify-center">
          <span className="font-bold uppercase tracking-wider text-xs text-secondary-content/80">
            Range
          </span>
          <span className="font-bold text-xs text-secondary-content">
            {rangeMin.toFixed(0)}% - {rangeMax.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
