"use client";

export default function GoalInput({ targetGrade, handleSaveTargetGrade }: { targetGrade: string, handleSaveTargetGrade: () => void }) {
    return (
        <>
            <span className="text-md font-bold uppercase tracking-wider text-base-content/50 mx-3">Goal</span>
            <div className="relative flex items-center flex-1 sm:flex-none justify-end">
                <input
                    type="number"
                    className="input input-md text-xl w-32 text-right pr-6 bg-base-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                    placeholder="-"
                    value={targetGrade}
                    onChange={(e) => handleSaveTargetGrade()}
                    onBlur={handleSaveTargetGrade}
                />
                <span className="absolute right-2 text-sm opacity-50 pointer-events-none">%</span>
            </div>
        </>
    );
}
