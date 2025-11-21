export default function RangeBadge({ rangeMin, rangeMax }: { rangeMin: number; rangeMax: number }) {
    return (
        <div className="relative">
            <div className="peer flex gap-2 items-center bg-base-300 badge badge-lg border-none">
                <div className="flex gap-2 items-center justify-center">
                    <span className="opacity-50 font-bold uppercase tracking-wider text-sm">Range</span>
                    <span className="font-bold text-sm text-base-content/70">{rangeMin.toFixed(1)}% - {rangeMax.toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}
