"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { faCheck, faEdit, faPlus, faRotateRight, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDates, formatTime } from "../../../lib/format-utils";
import { sendTelemetry } from "../../../lib/telemetry";
import Modal from "../../components/modal";
import { getCategoryColor, useCourses } from "../course-context";

function processSchedule(schedule: any[]) {
    if (!schedule) return [];

    const groups: Record<string, any> = {};

    schedule.forEach((item) => {
        // Derive day of week from dates if not present or if we want to group by it
        let days = item["Days of Week"] || [];
        if (days.length === 0 && item["Meet Dates"]) {
            days = Array.from(new Set(item["Meet Dates"].map((d: string) =>
                new Date(d).toLocaleDateString("en-US", { weekday: "short" })
            )));
        }
        const daysStr = days.sort().join(",");

        // Group by Section, Component, Days, Time, Location
        const key = `${item.Section}|${item.Component}|${JSON.stringify(item["Start Time"])}|${JSON.stringify(item["End Time"])}|${item.Location}|${daysStr}`;

        if (!groups[key]) {
            groups[key] = { ...item, "Meet Dates": [...(item["Meet Dates"] || [])], "Days of Week": days };
        } else {
            groups[key]["Meet Dates"].push(...(item["Meet Dates"] || []));
        }
    });

    return Object.values(groups);
}

export default function CourseDetailPage() {
    const { id } = useParams();
    const { courses, updateSections, updateMarkingSchemes } = useCourses();

    const selectedCourse = courses.find((c) => c.id === id);

    const [isEditingSections, setIsEditingSections] = useState(false);
    const [isEditingMarkingSchemes, setIsEditingMarkingSchemes] = useState(false);
    const [tempMarkingSchemes, setTempMarkingSchemes] = useState<any[][]>([]);
    const [showSectionConfirm, setShowSectionConfirm] = useState(false);
    const [missingComponents, setMissingComponents] = useState<string[]>([]);

    // Reset editing states when course changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsEditingSections(false);
        setIsEditingMarkingSchemes(false);
        setTempMarkingSchemes([]);
        setShowSectionConfirm(false);
    }, [id]);

    // Send view telemetry when the user visits this page
    useEffect(() => {
        if (!id) return;
        sendTelemetry("view_course", { course_id: id });
    }, [id]);

    if (!selectedCourse) return null;

    const processedSchedule = selectedCourse ? processSchedule(selectedCourse.data["schedule-info"] || []) : [];

    const displayedSchedule = processedSchedule.filter((info) => {
        if (isEditingSections) return true;
        const selectedSection = selectedCourse?.sections?.[info.Component];
        return !selectedSection || selectedSection === info.Section;
    }).sort((a: any, b: any) => (a.Section || "").localeCompare(b.Section || ""));

    function handleSectionEditToggle() {
        if (isEditingSections) {
            const uniqueComponents = Array.from(new Set(processedSchedule.map((item: any) => item.Component)));
            const missing = uniqueComponents.filter(comp => !selectedCourse?.sections?.[comp]);

            if (missing.length > 0) {
                setMissingComponents(missing);
                setShowSectionConfirm(true);
                return;
            }
        }
        const newState = !isEditingSections;
        setIsEditingSections(newState);
        // Telemetry: record whether the sections editor was toggled
        sendTelemetry("toggle_sections", { course_id: id, state: newState });
        // If we are closing the editor, record that sections were saved
        if (isEditingSections) {
            sendTelemetry("save_sections", { course_id: id });
        }
    }

    function confirmSectionEdit() {
        setShowSectionConfirm(false);
        const newState = !isEditingSections;
        setIsEditingSections(newState);
        sendTelemetry("toggle_sections", { course_id: id, state: newState });
        if (isEditingSections) {
            sendTelemetry("save_sections", { course_id: id });
        }
    }

    function toggleMarkingSchemesEdit() {
        if (isEditingMarkingSchemes) {
            if (selectedCourse) {
                updateMarkingSchemes(selectedCourse.id, tempMarkingSchemes);
            }
            setIsEditingMarkingSchemes(false);
        } else {
            if (selectedCourse?.data["marking-schemes"]) {
                setTempMarkingSchemes(JSON.parse(JSON.stringify(selectedCourse.data["marking-schemes"])));
            } else {
                setTempMarkingSchemes([]);
            }
            setIsEditingMarkingSchemes(true);
        }
        sendTelemetry("toggle_marking_schemes", { state: !isEditingMarkingSchemes });
    }

    function addScheme() {
        if (tempMarkingSchemes.length > 0) {
            const components = tempMarkingSchemes[0].map((item: any) => ({ Component: item.Component, Weight: item.Weight }));
            setTempMarkingSchemes([...tempMarkingSchemes, components]);
        }
    }

    function removeScheme(index: number) {
        const newSchemes = [...tempMarkingSchemes];
        newSchemes.splice(index, 1);
        setTempMarkingSchemes(newSchemes);
    }

    function updateWeight(schemeIndex: number, componentIndex: number, value: string) {
        const newSchemes = [...tempMarkingSchemes];
        newSchemes[schemeIndex][componentIndex].Weight = value;
        setTempMarkingSchemes(newSchemes);
    }

    function updateComponentName(componentIndex: number, newName: string) {
        const newSchemes = tempMarkingSchemes.map(scheme => {
            const newScheme = [...scheme];
            if (newScheme[componentIndex]) {
                newScheme[componentIndex] = { ...newScheme[componentIndex], Component: newName };
            }
            return newScheme;
        });
        setTempMarkingSchemes(newSchemes);
    }

    function addComponent() {
        const newSchemes = tempMarkingSchemes.map(scheme => {
            return [...scheme, { Component: "New Component", Weight: "0" }];
        });
        setTempMarkingSchemes(newSchemes);
        sendTelemetry("add_component", {});
    }

    function removeComponent(index: number) {
        const newSchemes = tempMarkingSchemes.map(scheme => {
            const newScheme = [...scheme];
            newScheme.splice(index, 1);
            return newScheme;
        });
        setTempMarkingSchemes(newSchemes);
        sendTelemetry("remove_component", { index });
    }

    function resetToDefault() {
        if (!selectedCourse?.data["marking-schemes"] || selectedCourse.data["marking-schemes"].length === 0) return;
        const defaultScheme = JSON.parse(JSON.stringify(selectedCourse.data["marking-schemes"][0]));
        const newSchemes = [...tempMarkingSchemes];
        newSchemes[0] = defaultScheme;
        setTempMarkingSchemes(newSchemes);
    }

    return (
        <>
            <Modal
                isOpen={showSectionConfirm}
                onClose={() => setShowSectionConfirm(false)}
                title="Missing Sections"
                onConfirm={confirmSectionEdit}
                actions={
                    <>
                        <button className="btn" onClick={() => setShowSectionConfirm(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={confirmSectionEdit}>Continue</button>
                    </>
                }
            >
                <p>You haven&apos;t selected a section for: {missingComponents.join(", ")}. Continue anyway?</p>
            </Modal>

            {/* Schedule Info */}
            {selectedCourse.data["schedule-info"] && (
                <div className="card bg-base-100 shadow-md">
                    <div className="card-body p-4 sm:p-8">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="card-title">Schedule</h2>
                            <button
                                className={"btn btn-sm btn-soft" + (isEditingSections ? " btn-success" : "")}
                                onClick={handleSectionEditToggle}
                            >
                                {selectedCourse.sections && Object.keys(selectedCourse.sections).length > 0
                                    ? isEditingSections
                                        ? <>Done <FontAwesomeIcon icon={faCheck} className="w-4 h-4" /></>
                                        : <><FontAwesomeIcon icon={faEdit} className="w-4 h-4" /> Edit Sections</>
                                    : isEditingSections
                                        ? <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                                        : <><FontAwesomeIcon icon={faEdit} className="w-4 h-4" /> Choose Sections</>}
                            </button>
                        </div>
                        <div className="overflow-x-auto border border-base-content/10 rounded-box">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        {isEditingSections && <th></th>}
                                        <th>Section</th>
                                        <th>Component</th>
                                        <th className="min-w-fit">Days</th>
                                        <th className="min-w-fit">Time</th>
                                        <th className="min-w-fit">Location</th>
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
                                                        checked={selectedCourse?.sections?.[info.Component] === info.Section}
                                                        onChange={() => selectedCourse && updateSections(selectedCourse.id, info.Component, info.Section)}
                                                    />
                                                </td>
                                            )}
                                            <td>{info.Section}</td>
                                            <td>{info.Component}</td>
                                            <td className="min-w-fit">
                                                {info["Meet Dates"] && info["Meet Dates"].length <= 3
                                                    ? formatDates(info["Meet Dates"])
                                                    : info["Days of Week"]?.join(", ")}
                                            </td>
                                            <td className="min-w-fit">
                                                {typeof info["Start Time"] === "object"
                                                    ? formatTime(info["Start Time"])
                                                    : info["Start Time"]}{" "}
                                                -{" "}
                                                {typeof info["End Time"] === "object"
                                                    ? formatTime(info["End Time"])
                                                    : info["End Time"]}
                                            </td>
                                            <td className="min-w-fit">{info.Location}</td>
                                            <td>
                                                {info.Instructors?.map((inst: any) => (
                                                    <div key={inst.Email}>
                                                        {inst.Name} <a href={`mailto:${inst.Email}`} className="text-xs opacity-50">({inst.Email})</a>
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Marking Schemes */}
            {(selectedCourse.data["marking-schemes"] || isEditingMarkingSchemes) && (
                <div className="card bg-base-100 shadow-md">
                    <div className="card-body p-4 sm:p-8">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="card-title">Marking Schemes</h2>
                            <button
                                className={"btn btn-sm btn-soft" + (isEditingMarkingSchemes ? " btn-success" : "")}
                                onClick={toggleMarkingSchemesEdit}
                            >
                                {isEditingMarkingSchemes ?
                                    <>Done <FontAwesomeIcon icon={faCheck} className="w-4 h-4" /></> :
                                    <><FontAwesomeIcon icon={faEdit} className="w-4 h-4" /> Edit Schemes</>}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(isEditingMarkingSchemes ? tempMarkingSchemes : selectedCourse.data["marking-schemes"] || []).map((scheme: any[], i: number) => (
                                <div key={i} className="relative group">
                                    {isEditingMarkingSchemes && i > 0 && (
                                        <button
                                            className="btn btn-xs btn-circle btn-error border-base-content/20 absolute -top-2 -right-2 z-10 shadow-md"
                                            onClick={() => removeScheme(i)}
                                        >
                                            ✕
                                        </button>
                                    )}
                                    {isEditingMarkingSchemes && i === 0 && (
                                        <button
                                            className="btn btn-xs btn-circle btn-ghost border-base-content/20 absolute -top-2 -right-2 z-10 shadow-md bg-base-100"
                                            onClick={resetToDefault}
                                            title="Reset to default"
                                        >
                                            <FontAwesomeIcon icon={faRotateRight} className="w-3 h-3 text-base-content/50" />
                                        </button>
                                    )}
                                    <div className="overflow-x-auto border border-base-content/10 rounded-box">
                                        <table className="table table-md w-full">
                                            <thead>
                                                <tr>
                                                    <th>Component</th>
                                                    <th className="text-right">Weight</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scheme.map((item: any, j: number) => (
                                                    <tr key={j}>
                                                        <td>
                                                            {isEditingMarkingSchemes ? (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        className="btn btn-sm btn-circle btn-soft text-error flex items-center justify-center mr-2"
                                                                        onClick={() => removeComponent(j)}
                                                                        title="Remove Component"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                                                                    </button>
                                                                    <input
                                                                        className="input input-sm text-sm input-bordered w-full"
                                                                        value={item.Component}
                                                                        onChange={(e) => updateComponentName(j, e.target.value)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`badge badge-xs ${getCategoryColor(item.Component)}`}></div>
                                                                    {item.Component}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-right">
                                                            {isEditingMarkingSchemes ? (
                                                                <div className="flex justify-end items-center gap-1">
                                                                    <input
                                                                        className="input input-sm text-sm input-bordered w-24 text-right"
                                                                        value={item.Weight}
                                                                        onChange={(e) => updateWeight(i, j, e.target.value)}
                                                                    />
                                                                    <span className="w-4">{!isNaN(Number(item.Weight)) && item.Weight !== "" ? "%" : ""}</span>
                                                                </div>
                                                            ) : (
                                                                !isNaN(Number(item.Weight)) && item.Weight !== "" ? `${item.Weight}%` : item.Weight
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {isEditingMarkingSchemes && (
                                                    <tr className="hover:bg-base-200 cursor-pointer border-t border-dashed border-base-content/20" onClick={addComponent}>
                                                        <td colSpan={2} className="text-center text-base-content/50 py-2">
                                                            <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Component
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-base-200">
                                                    <td className="font-bold">Total</td>
                                                    <td className="text-right font-bold">
                                                        {scheme.reduce((acc, item) => {
                                                            const weight = Number(item.Weight);
                                                            return !isNaN(weight) && item.Weight !== "" ? acc + weight : acc;
                                                        }, 0)}%
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            ))}
                            {isEditingMarkingSchemes && (
                                <div className="flex flex-col gap-2 items-center justify-center border border-dashed border-base-content/20 card min-h-[200px]">
                                    <button className="btn btn-ghost" onClick={addScheme}>
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Scheme
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
