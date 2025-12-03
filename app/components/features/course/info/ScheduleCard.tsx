/* eslint-disable @typescript-eslint/no-explicit-any */

import { faCheck, faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatDates, formatTime } from "../../../../../lib/format-utils";
import ExternalLink from "../../../ui/ExternalLink";

interface ScheduleCardProps {
  scheduleInfo: any[];
  sections?: Record<string, string>;
  isEditingSections: boolean;
  onToggleEdit: () => void;
  onUpdateSection: (component: string, section: string) => void;
  processedSchedule: any[];
}

export default function ScheduleCard({
  scheduleInfo,
  sections,
  isEditingSections,
  onToggleEdit,
  onUpdateSection,
  processedSchedule,
}: ScheduleCardProps) {
  if (!scheduleInfo) return null;

  const displayedSchedule = processedSchedule
    .filter((info) => {
      if (isEditingSections) return true;
      const selectedSection = sections?.[info.Component];
      return !selectedSection || selectedSection === info.Section;
    })
    .sort((a: any, b: any) => (a.Section || "").localeCompare(b.Section || ""));

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4 sm:p-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="card-title text-2xl">Schedule</h2>
          <button
            className={
              "btn btn-sm btn-soft" + (isEditingSections ? " btn-success" : "")
            }
            onClick={onToggleEdit}
            title={
              isEditingSections
                ? "Done"
                : sections && Object.keys(sections).length > 0
                  ? "Edit Sections"
                  : "Choose Sections"
            }
          >
            {sections && Object.keys(sections).length > 0 ? (
              isEditingSections ? (
                <>
                  Done{" "}
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="w-4 h-4"
                    aria-hidden="true"
                  />
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={faEdit}
                    className="w-4 h-4"
                    aria-hidden="true"
                  />{" "}
                  Edit Sections
                </>
              )
            ) : isEditingSections ? (
              <FontAwesomeIcon
                icon={faCheck}
                className="w-4 h-4"
                aria-hidden="true"
              />
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faEdit}
                  className="w-4 h-4"
                  aria-hidden="true"
                />{" "}
                Choose Sections
              </>
            )}
          </button>
        </div>
        <div className="overflow-x-auto border border-base-content/10 rounded-box">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                {isEditingSections && <th></th>}
                <th>Section</th>
                <th>Component</th>
                <th>Days</th>
                <th>Time</th>
                <th>Location</th>
                <th>Instructors</th>
              </tr>
            </thead>
            <tbody>
              {displayedSchedule.map((info: any, i: number) => (
                <tr key={i}>
                  {isEditingSections && (
                    <td>
                      <input
                        type="radio"
                        name={`section-${info.Component}-${i}`}
                        className="radio radio-primary radio-sm"
                        checked={sections?.[info.Component] === info.Section}
                        onChange={() =>
                          onUpdateSection(info.Component, info.Section)
                        }
                      />
                    </td>
                  )}
                  <td>{info.Section}</td>
                  <td>{info.Component}</td>
                  <td className="min-w-32">
                    {info["Meet Dates"] && info["Meet Dates"].length <= 3
                      ? formatDates(info["Meet Dates"])
                      : info["Days of Week"]?.join(", ")}
                  </td>
                  <td className="text-nowrap">
                    {typeof info["Start Time"] === "object"
                      ? formatTime(info["Start Time"])
                      : info["Start Time"]}{" "}
                    -{" "}
                    {typeof info["End Time"] === "object"
                      ? formatTime(info["End Time"])
                      : info["End Time"]}
                  </td>
                  <td className="min-w-fit">{info.Location}</td>
                  <td className="flex flex-col gap-2">
                    {(info.Instructors && info.Instructors.length > 0) ? (
                      info.Instructors?.map((inst: any) => (
                        <div key={inst.Email}>
                          <p>{inst.Name}</p>
                          <ExternalLink
                            href={`mailto:${inst.Email}`}
                            className="text-xs"
                            decorations="text-base-content/70 hover:underline"
                          >
                            ({inst.Email})
                          </ExternalLink>
                        </div>
                      ))
                    ) : (
                      <div>
                        <span className="text-xs opacity-50 italic">TBA</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
}
