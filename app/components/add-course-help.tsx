import Image from "next/image";

export default function AddCourseHelp() {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold">Adding a Course</h2>
            <p>
                Find your course outline from <a target="_blank" href="https://outline.uwaterloo.ca/viewer" className="underline">Outline.uwaterloo.ca</a>.
            </p>
            <p className="text-base-content/50">
                Unfortunately, we only support course imports from Outline.uwaterloo.ca at this time.
            </p>
            <Image src="/outlineuwaterlooca.png" alt="Outline.uwaterloo.ca screenshot" width={736} height={367} className="my-2 rounded-lg" />
            <p>
                Select the course you wish to add and click &quot;Save a Local Copy&quot; to download the outline file as an HTML document.
            </p>
            <Image src="/savealocalcopy.png" alt="Save a Local Copy button" width={736} height={316} className="my-2 rounded-lg" />
            <p>
                Click the &quot;+&quot; button in the sidebar and upload the downloaded outline file. The course will then be automatically parsed and added to your dashboard!
            </p>
        </section>
    );
}
