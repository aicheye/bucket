"use client";

export default function GoalInput({
  targetGrade,
  handleSaveTargetGrade,
  setTargetGrade,
}: {
  targetGrade: string;
  handleSaveTargetGrade: () => void;
  setTargetGrade: (v: string) => void;
}) {
  return (
    <>
      <span className="text-md font-bold uppercase tracking-wider text-base-content/50 ml-1">
        Goal
      </span>
      <div className="relative flex items-center flex-1 sm:flex-none justify-end gap-1">
        <input
          type="number"
          className="input input-md text-xl w-20 text-right bg-base-100 outline-none border border-base-content/30 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
          placeholder="--"
          value={targetGrade}
          onChange={(e) => setTargetGrade(e.target.value)}
          onBlur={handleSaveTargetGrade}
        />
        <span className="right-2 text-lg font-bold text-base-content/50">
          %
        </span>
      </div>
    </>
  );
}
