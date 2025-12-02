"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sendTelemetry } from "../../../../lib/telemetry";
import MarkingSchemesCard from "../../../components/features/info/MarkingSchemesCard";
import ScheduleCard from "../../../components/features/info/ScheduleCard";
import Modal from "../../../components/ui/Modal";
import { useCourses } from "../../../contexts/CourseContext";

function processSchedule(schedule: any[]) {
  if (!schedule) return [];

  const groups: Record<string, any> = {};

  schedule.forEach((item) => {
    // Derive day of week from dates if not present or if we want to group by it
    let days = item["Days of Week"] || [];
    if (days.length === 0 && item["Meet Dates"]) {
      days = Array.from(
        new Set(
          item["Meet Dates"].map((d: string) =>
            new Date(d).toLocaleDateString("en-US", { weekday: "short" }),
          ),
        ),
      );
    }
    const daysStr = days.sort().join(",");

    // Group by Section, Component, Days, Time, Location
    const key = `${item.Section}|${item.Component}|${JSON.stringify(item["Start Time"])}|${JSON.stringify(item["End Time"])}|${item.Location}|${daysStr}`;

    if (!groups[key]) {
      groups[key] = {
        ...item,
        "Meet Dates": [...(item["Meet Dates"] || [])],
        "Days of Week": days,
      };
    } else {
      groups[key]["Meet Dates"].push(...(item["Meet Dates"] || []));
    }
  });

  return Object.values(groups);
}

export default function CourseDetailInfoPage() {
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

  const processedSchedule = selectedCourse
    ? processSchedule(selectedCourse.data["schedule-info"] || [])
    : [];

  const displayedSchedule = processedSchedule
    .filter((info) => {
      if (isEditingSections) return true;
      const selectedSection = selectedCourse?.sections?.[info.Component];
      return !selectedSection || selectedSection === info.Section;
    })
    .sort((a: any, b: any) => (a.Section || "").localeCompare(b.Section || ""));

  function handleSectionEditToggle() {
    if (isEditingSections) {
      const uniqueComponents = Array.from(
        new Set(processedSchedule.map((item: any) => item.Component)),
      );
      const missing = uniqueComponents.filter(
        (comp) => !selectedCourse?.sections?.[comp],
      );

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
        setTempMarkingSchemes(
          JSON.parse(JSON.stringify(selectedCourse.data["marking-schemes"])),
        );
      } else {
        setTempMarkingSchemes([]);
      }
      setIsEditingMarkingSchemes(true);
    }
    sendTelemetry("toggle_marking_schemes", {
      state: !isEditingMarkingSchemes,
    });
  }

  function addScheme() {
    if (tempMarkingSchemes.length > 0) {
      const components = tempMarkingSchemes[0].map((item: any) => ({
        Component: item.Component,
        Weight: item.Weight,
      }));
      setTempMarkingSchemes([...tempMarkingSchemes, components]);
    }
  }

  function removeScheme(index: number) {
    const newSchemes = [...tempMarkingSchemes];
    newSchemes.splice(index, 1);
    setTempMarkingSchemes(newSchemes);
  }

  function updateWeight(
    schemeIndex: number,
    componentIndex: number,
    value: string,
  ) {
    const newSchemes = [...tempMarkingSchemes];
    newSchemes[schemeIndex][componentIndex].Weight = value;
    setTempMarkingSchemes(newSchemes);
  }

  function updateComponentName(componentIndex: number, newName: string) {
    const newSchemes = tempMarkingSchemes.map((scheme) => {
      const newScheme = [...scheme];
      if (newScheme[componentIndex]) {
        newScheme[componentIndex] = {
          ...newScheme[componentIndex],
          Component: newName,
        };
      }
      return newScheme;
    });
    setTempMarkingSchemes(newSchemes);
  }

  function addComponent() {
    const newSchemes = tempMarkingSchemes.map((scheme) => {
      return [...scheme, { Component: "New Component", Weight: "0" }];
    });
    setTempMarkingSchemes(newSchemes);
    sendTelemetry("add_component", {});
  }

  function removeComponent(index: number) {
    const newSchemes = tempMarkingSchemes.map((scheme) => {
      const newScheme = [...scheme];
      newScheme.splice(index, 1);
      return newScheme;
    });
    setTempMarkingSchemes(newSchemes);
    sendTelemetry("remove_component", { index });
  }

  function resetToDefault() {
    if (
      !selectedCourse?.data["marking-schemes"] ||
      selectedCourse.data["marking-schemes"].length === 0
    )
      return;
    const defaultScheme = JSON.parse(
      JSON.stringify(selectedCourse.data["marking-schemes"][0]),
    );
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
            <button
              className="btn"
              onClick={() => setShowSectionConfirm(false)}
              title="Cancel"
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={confirmSectionEdit}>
              Continue
            </button>
          </>
        }
      >
        <p>
          You haven&apos;t selected a section for:{" "}
          {missingComponents.join(", ")}. Continue anyway?
        </p>
      </Modal>

      <ScheduleCard
        scheduleInfo={selectedCourse.data["schedule-info"]}
        sections={selectedCourse.sections}
        isEditingSections={isEditingSections}
        onToggleEdit={handleSectionEditToggle}
        onUpdateSection={(component, section) =>
          selectedCourse &&
          updateSections(selectedCourse.id, component, section)
        }
        processedSchedule={processedSchedule}
      />

      <MarkingSchemesCard
        markingSchemes={selectedCourse.data["marking-schemes"]}
        isEditing={isEditingMarkingSchemes}
        onToggleEdit={toggleMarkingSchemesEdit}
        tempMarkingSchemes={tempMarkingSchemes}
        onUpdateWeight={updateWeight}
        onUpdateComponentName={updateComponentName}
        onAddComponent={addComponent}
        onRemoveComponent={removeComponent}
        onAddScheme={addScheme}
        onRemoveScheme={removeScheme}
        onResetToDefault={resetToDefault}
        allComponents={
          selectedCourse?.data["marking-schemes"]
            ?.flat()
            .map((s: any) => s.Component) || []
        }
      />
    </>
  );
}
