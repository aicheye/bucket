import { Metadata } from "next";
import { APP_NAME } from "../../lib/constants";
import AddCourseHelp from "../components/features/AddCourseHelp";
import ProsePageContainer from "../components/features/ProsePageContainer";

export const metadata: Metadata = {
  title: `${APP_NAME} | Help & FAQ`,
};

export default function HelpPage() {
  return (
    <ProsePageContainer>
      <h1 className="text-4xl font-bold">Help & FAQ</h1>

      <section id="getting-started" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Getting Started</h2>
        <p>
          Sign in with your Google account, then create a new course from the
          dashboard. Courses appear in the sidebar for quick access.
        </p>
      </section>

      <section id="add-course" className="flex flex-col gap-4">
        <AddCourseHelp />
      </section>

      <section id="managing-courses" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Managing Courses</h2>
        <p>
          Click a course in the sidebar to view details. From a course page you
          can add items (assignments, exams), edit the marking scheme, or delete
          the course. Deleting a course removes its grades and settings
          permanently.
        </p>
      </section>

      <section id="grade-calculation" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Grade Calculation</h2>
        <p>{APP_NAME} computes several useful metrics from your course data:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Current Grade:</strong> Weighted average of graded items —
            ungraded items are ignored for this value.
          </li>
          <li>
            <strong>Term Average / Term GPA:</strong> Aggregated across all
            courses in the current term. GPA uses the OUAC scale conversion.
          </li>
          <li>
            <strong>Cumulative Average / CGPA:</strong> Aggregated across all
            terms and courses.
          </li>
          <li>
            <strong>Credits Earned:</strong> Total credits from passing courses
            (&ge; 50%).
          </li>
          <li>
            <strong>Range (Min / Max):</strong> Minimum and maximum possible
            final grades based on remaining ungraded items.
          </li>
          <li>
            <strong>Required to Goal:</strong> Average percentage needed on all
            remaining items to reach a set target grade.
          </li>
          <li>
            <strong>Contribution:</strong> How much each graded item affects the
            overall percentage (positive when above average, negative when
            below).
          </li>
          <li>
            <strong>Category Weights:</strong> Weights for categories (Homework,
            Exams, etc.) appear in the marking scheme and affect calculations.
          </li>
        </ul>
        <p className="text-sm opacity-70 mt-2">
          Note: If a category has no graded items yet, its weight is
          proportionally distributed for the <em>Current Grade</em> view.
        </p>
      </section>

      <section id="account-deletion" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Account Deletion</h2>
        <p>
          To delete your account, open your profile settings and choose
          &quot;Delete Account&quot;. This permanently removes your user data
          and all associated courses.
        </p>
      </section>

      <section id="faq" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold">How are grades rounded?</dt>
            <dd className="mt-1">
              Although grades are shown rounded to 0, 1, or 2 decimal places,
              the underlying calculations use full precision to ensure accuracy.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              Can I import grades from other sites?
            </dt>
            <dd className="mt-1">
              You can import grades using the parser endpoints under the API —
              see the import grades modal on the Grades page.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">
              Why does my current grade differ from the syllabus?
            </dt>
            <dd className="mt-1">
              Current Grade ignores ungraded items; the syllabus final grade
              assumes all items are weighted and some may be future or
              estimated.
            </dd>
          </div>
        </dl>
      </section>

      <section id="contact" className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold">Contact / Feedback</h2>
        <p>
          Report bugs or request features by emailing
          <a href="mailto:sean@seanyang.me" className="underline ml-1">
            sean@seanyang.me
          </a>
          .
        </p>
      </section>
    </ProsePageContainer>
  );
}
