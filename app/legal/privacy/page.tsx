import Footer from "../../components/footer";
import Navbar from "../../components/navbar";

export default function PrivacyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex flex-col flex-1 gap-8 max-w-3xl mx-auto py-12 px-4 w-full text-base-content text-left">
                <h1 className="text-3xl font-bold" id="privacy-policy">Privacy Policy</h1>
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-bold">Information Collected</h2>
                    <p>
                        We only collect information necessary for account creation and course management, limited to the following:
                    </p>
                    <ul className="ml-4 list-disc list-inside">
                        <li>Google email address and profile picture</li>
                        <li>Full name</li>
                        <li>Course data such as titles, descriptions, sections, grades, exam dates, etc.</li>
                    </ul>
                    <h2 className="text-2xl font-bold">Data Usage</h2>
                    <p>
                        Anonymized usage data is collected to calculate metrics limited to the number of active users and feature usage patterns.
                    </p>
                    <p>
                        Your data is used solely to provide and improve our services, including:
                    </p>
                    <ul className="ml-4 list-disc list-inside">
                        <li>Account authentication and management</li>
                        <li>Course organization and display</li>
                        <li>A personalized user experience</li>
                    </ul>
                    <h2 className="text-2xl font-bold">Data Sharing</h2>
                    <p>
                        We do not share your personal data with third parties except as required by law.
                    </p>
                    <p>
                        Third-party services used for authentication (Google Cloud) and data hosting (DigitalOcean) do not have any additional access to your personal data beyond what is necessary to provide their services.
                    </p>
                    <h2 className="text-2xl font-bold">Data Security</h2>
                    <p>
                        We employ safeguards to protect your data, including encryption in transit (TLS) and at rest, regular security audits, and strict access controls.
                    </p>
                    <h2 className="text-2xl font-bold">User Rights</h2>
                    <p>
                        You have the right to access, modify, or delete your personal data at any time by contacting us at <a href="mailto:sean@seanyang.me" className="underline">sean@seanyang.me</a>.
                    </p>
                    <p>
                        Upon account deletion, all your personal data and associated courses will be permanently removed from our systems. This process is irreversible.
                    </p>
                    <h2 className="text-2xl font-bold">Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. All users will be notified of any changes via email. Continued use of the service constitutes acceptance of the updated policy.
                    </p>
                    <p className="font-bold rounded-box border-5 border-error/30 p-4">
                        We will never change this Privacy Policy in a way that is less protective of your data without your explicit consent.
                    </p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
