/**
 * Term statistics card showing averages, GPA, range, goal, and progress
 */

import Card from "../../ui/Card";
import GoalInput from "../GoalInput";
import GradeBadge from "../GradeBadge";
import RangeBadge from "../RangeBadge";
import ReqAvgBadge from "../ReqAvgBadge";

interface TermStatsCardProps {
  termAverage: number | null;
  termGPA: number | null;
  termMin: number | null;
  termMax: number | null;
  termGoal: string;
  setTermGoal: (goal: string) => void;
  onSaveGoal: () => void;
  requiredAverage: number | null;
  timeProgress: number;
  weightCompletedPercent: number;
}

export default function TermStatsCard({
  termAverage,
  termGPA,
  termMin,
  termMax,
  termGoal,
  setTermGoal,
  onSaveGoal,
  requiredAverage,
  timeProgress,
  weightCompletedPercent,
}: TermStatsCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card
        shadow="sm"
        padding="md"
        className="h-full items-center flex flex-col justify-around gap-3 flex-grow"
      >
        <div className="flex flex-row items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">
              Term AVG
            </div>
            <GradeBadge grade={termAverage} />
          </div>

          <div className="h-12 border border-base-content/10"></div>

          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">
              Term GPA
            </div>
            <GradeBadge gpa={termGPA} />
          </div>
        </div>

        {termMin !== null && termMax !== null && (
          <RangeBadge rangeMin={termMin} rangeMax={termMax} />
        )}

        <div className="border border-base-content/10 max-w-[10rem] w-full"></div>

        <div className="flex flex-row items-center justify-between gap-2 bg-base-200 p-2 card w-full shadow-sm">
          <GoalInput
            handleSaveTargetGrade={onSaveGoal}
            targetGrade={termGoal}
            setTargetGrade={setTermGoal}
          />
        </div>

        {requiredAverage !== null && termAverage !== null && (
          <ReqAvgBadge
            requiredAverage={requiredAverage}
            average={termAverage}
          />
        )}
      </Card>

      <div className="md:col-span-3 flex justify-center items-center">
        <Card shadow="sm" padding="md" className="w-full max-w-4xl">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase text-base-content/70">
                  Term Progress
                </span>
                <span className="text-sm font-bold">
                  {timeProgress.toFixed(1)}%
                </span>
              </div>
              <progress
                className="progress progress-primary w-full h-3"
                value={timeProgress}
                max="100"
              ></progress>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase text-base-content/70">
                  Weight Completed
                </span>
                <span className="text-sm font-bold">
                  {weightCompletedPercent.toFixed(1)}%
                </span>
              </div>
              <progress
                className="progress progress-secondary w-full h-3"
                value={weightCompletedPercent}
                max="100"
              ></progress>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Test skeleton for TermStatsCard
 *
 * @jest-environment jsdom
 */
// describe("TermStatsCard", () => {
//   it("should display term averages and GPA", () => {
//     // TODO: Implement test
//   });
//
//   it("should show range badge when min/max available", () => {
//     // TODO: Implement test
//   });
//
//   it("should handle goal input changes", () => {
//     // TODO: Implement test
//   });
//
//   it("should show required average when goal is set", () => {
//     // TODO: Implement test
//   });
//
//   it("should display progress bars", () => {
//     // TODO: Implement test
//   });
// });
