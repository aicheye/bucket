"use client";

import { useState } from "react";
import { useCourses } from "../../contexts/CourseContext";

export default function FixMeetDatesPage() {
  const { fixStoredMeetDates } = useCourses();
  const [status, setStatus] = useState<string | null>(null);

  const runFix = async () => {
    setStatus("Running...");
    try {
      const count = await fixStoredMeetDates();
      setStatus(`${count} course(s) updated`);
    } catch (e) {
      setStatus("Failed: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Fix Meet Dates</h1>
      <p className="mb-4">This will convert any stored ISO datetimes in course schedule "Meet Dates" to date-only strings (YYYY-MM-DD) and push updates to the server.</p>
      <button className="btn btn-primary" onClick={runFix}>Run Fix</button>
      {status && <div className="mt-4">{status}</div>}
    </div>
  );
}
