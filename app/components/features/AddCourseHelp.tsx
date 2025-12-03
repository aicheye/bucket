import Image from "next/image";
import ExternalLink from "../ui/ExternalLink";

export default function AddCourseHelp() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">Adding a Course</h2>
      <p>
        Find your course outline from{" "}
        <ExternalLink href="https://outline.uwaterloo.ca/viewer">
          Outline.uwaterloo.ca
        </ExternalLink>
        .
      </p>
      <p className="text-base-content/50">
        Unfortunately, we only support course imports from Outline.uwaterloo.ca
        at this time.
      </p>
      <div className="card bg-base-300 p-4">
        <Image
          src="/outlineuwaterlooca.png"
          alt="Outline.uwaterloo.ca screenshot"
          width={640}
          height={319}
          className="card"
        />
      </div>
      <p>
        Select the course you wish to add and click &quot;Save a Local
        Copy&quot; to download the outline file as an HTML document.
      </p>
      <div className="card bg-base-300 p-4">
        <Image
          src="/savealocalcopy.png"
          alt="Save a Local Copy button"
          width={640}
          height={275}
          className="card"
        />
      </div>
      <p>
        Click the &quot;+&quot; button in the sidebar and upload the downloaded
        outline file. The course will then be automatically parsed and added to
        your dashboard!
      </p>
    </section>
  );
}
