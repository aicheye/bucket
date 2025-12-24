import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ExternalLink from "../ui/ExternalLink";
import {
  faPlus,
  faInfoCircle,
  faPlusCircle,
  faFileCode,
  faFileArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import Line from "../ui/Line";

export default function AddCourseHelp() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Adding a Course</h2>
        <p>
          Click the <span className="font-bold">+</span> button in the sidebar
          to open the &quot;Add Course&quot; menu. You will see three options:
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">
          <FontAwesomeIcon icon={faPlusCircle} /> Create Course from Scratch
        </h3>
        <p>
          Use this option to manually create a course placeholder. This is
          useful for future courses where you don't have an outline yet but want
          to plan your term.
        </p>
        <ul className="list-disc list-inside ml-2 mt-2">
          <li>
            Enter the <strong>Course Code</strong> (e.g., CHE 102).
          </li>
          <li>
            Select the <strong>Term</strong> (e.g., Winter 2025).
          </li>
          <li>
            The course will be created with a default "Assignments" (100%)
            marking scheme.
          </li>
        </ul>
      </div>

      <Line direction="hor" className="w-full" />

      <div id="outlines">
        <h3 className="text-xl font-semibold mb-2">
          <FontAwesomeIcon icon={faFileCode} /> Import Course from Outline
        </h3>
        <p>
          The best way to add a current course. This automatically parses the
          marking scheme and schedule from the official syllabus.
        </p>
        <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
          <li>
            Log into{" "}
            <ExternalLink href="https://outline.uwaterloo.ca/viewer">
              Outline.uwaterloo.ca
            </ExternalLink>
            .
          </li>
          <li>
            Find your course and click <strong>View</strong> to open the
            outline.
          </li>
          <li>
            Click <strong>Save a Local Copy</strong> to download the HTML file.
          </li>
          <li>
            Upload this file in the &quot;Import Course from Outline&quot;
            screen.
          </li>
        </ol>
      </div>

      <Line direction="hor" className="w-full" />

      <div id="transcript">
        <h3 className="text-xl font-semibold mb-2">
          <FontAwesomeIcon icon={faFileArrowUp} /> Import Transcript
        </h3>
        <p>
          Use this to bulk-import your past history or update grades for
          existing courses.
        </p>
        <ol className="list-decimal list-inside space-y-2 ml-2 mt-2">
          <li>
            Log in to{" "}
            <ExternalLink href="https://quest.pecs.uwaterloo.ca/">
              Quest
            </ExternalLink>
            .
          </li>
          <li>
            Go to <strong>Academics</strong> &gt; select{" "}
            <strong>Unofficial Transcript</strong>.
          </li>
          <li>
            Select <strong>Undergrad Unofficial</strong>, then click{" "}
            <strong>View Report</strong>.
          </li>
          <li>Download the resulting PDF.</li>
          <li>Upload the PDF in the &quot;Import Transcript&quot; screen.</li>
        </ol>
        <div className="alert alert-info alert-soft text-sm mt-4">
          <FontAwesomeIcon icon={faInfoCircle} />
          <span>
            <strong>Note:</strong> This checks for courses by{" "}
            <strong>Code</strong> AND <strong>Term</strong>. It will update
            grades for matching courses and offer to create new entries for
            completed courses found in the transcript.
          </span>
        </div>
      </div>
    </section>
  );
}
