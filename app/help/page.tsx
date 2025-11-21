import AddCourseHelp from "../components/add-course-help";
import Footer from "../components/footer";
import Navbar from "../components/navbar";

export default function HelpPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1 max-w-3xl mx-auto py-12 px-4 w-full text-base-content flex flex-col gap-8">
                <h1 className="text-4xl font-bold">Help & FAQ</h1>
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Getting Started</h2>
                    <p>
                        To get started with Bucket, sign in using your Google account. Once signed in, you can create and manage your courses.
                    </p>
                </section>
                <AddCourseHelp />
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Managing Courses</h2>
                    <p>
                        Click on a course in the sidebar to view and manage its details. You can edit course information or delete the course if needed.
                    </p>
                </section>
                <section className="flex flex-col gap-4" id="grade-calculation">
                    <h2 className="text-2xl font-semibold">Grade Calculation</h2>
                    <p>
                        Bucket calculates your grades based on the marking schemes defined for each course.
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li>
                            <strong>Current Grade:</strong> This is your weighted average based on the items you have received grades for so far. It ignores any items that are not yet graded.
                        </li>
                        <li>
                            <strong>Term Average:</strong> The average of your current grades for all courses in the current term.
                        </li>
                        <li>
                            <strong>Term GPA:</strong> The average GPA of all courses in the current term, calculated by converting each course's percentage grade to a 4.0 scale according to <a href="https://www.ouac.on.ca/guide/undergraduate-grade-conversion-table/#conversion-table" target="_blank" rel="noopener noreferrer" className="link link-primary">OUAC Scale 3</a>.
                        </li>
                        <li>
                            <strong>Cumulative Average (CAV):</strong> The average of your final (or current) grades across all courses in all terms.
                        </li>
                        <li>
                            <strong>Cumulative GPA (CGPA):</strong> The average GPA across all courses in all terms.
                        </li>
                        <li>
                            <strong>Range:</strong> The range shows your minimum and maximum possible final grade.
                            <ul className="list-disc list-inside ml-6 mt-1 text-sm opacity-80">
                                <li><strong>Min:</strong> Assumes you get 0% on all remaining ungraded items.</li>
                                <li><strong>Max:</strong> Assumes you get 100% on all remaining ungraded items.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Required to Goal:</strong> If you set a target grade, this tells you what average percentage you need to achieve on all remaining ungraded items to reach that goal.
                        </li>
                    </ul>
                    <p className="text-sm opacity-70 mt-2">
                        Note: If a category has no graded items yet, its weight is distributed proportionally among the other categories for the "Current Grade" calculation.
                    </p>
                </section>
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Account Deletion</h2>
                    <p>
                        To delete your account, go to your profile settings and click &quot;Delete Account&quot;. This will remove your user data and all associated courses permanently.
                    </p>
                </section>
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Contact Support</h2>
                    <p>
                        If you have need further assistance, feel free to reach out to me at <a href="mailto:sean@seanyang.me" className="underline">sean@seanyang.me</a>.
                    </p>
                </section>
            </div>
            <Footer />
        </div>
    );
}
