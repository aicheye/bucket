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
                <section className="flex flex-col gap-4">
                    <h2 className="text-2xl font-semibold">Account Deletion</h2>
                    <p>
                        To delete your account, go to your profile settings and click "Delete Account". This will remove your user data and all associated courses permanently.
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
