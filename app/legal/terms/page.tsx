import type { Metadata } from "next";
import { APP_NAME } from "../../../lib/constants";
import ProsePageContainer from "../../components/features/ProsePageContainer";
import ExternalLink from "../../components/ui/ExternalLink";

export const metadata: Metadata = {
  title: `${APP_NAME} | Terms of Service`,
};

export default function TermsPage() {
  return (
    <ProsePageContainer>
      <h1 className="text-3xl font-bold" id="terms-of-service">
        Terms of Service
      </h1>
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Acceptance of Terms</h2>
        <p>
          By using our services, you agree to comply with and be bound by these
          Terms of Service.
        </p>
        <h2 className="text-2xl font-bold">Account Deletion</h2>
        <p>
          Users may delete their accounts at any time, which will result in the
          permanent removal of all associated data.
        </p>
        <h2 className="text-2xl font-bold">Acceptable Use</h2>
        <p>
          Users agree not to engage in any activities that violate applicable
          laws or regulations, infringe on the rights of others, or interfere
          with the operation of our services.
        </p>
        <p>
          Users must follow the University of Waterloo&apos;s{" "}
          <ExternalLink
            href="https://uwaterloo.ca/secretariat/policies-procedures-guidelines/policies"
          >
            policies, procedures, and guidelines
          </ExternalLink>
          {" "}while using our services.
        </p>
        <p>
          Prohibited activities include, but are not limited to, hacking,
          distributing malware, spamming, and attempting to gain unauthorized
          access to our systems or other users&apos; accounts.
        </p>
        <h2 className="text-2xl font-bold">Termination of Service</h2>
        <p>
          We reserve the right to terminate or suspend user accounts that
          violate these Terms of Service or engage in harmful activities.
        </p>
        <h2 className="text-2xl font-bold">Modifications to Terms</h2>
        <p>
          All users will be notified of any changes to these Terms of Service
          via email. Continued use of the service constitutes acceptance of the
          updated terms.
        </p>
      </div>
    </ProsePageContainer>
  );
}
