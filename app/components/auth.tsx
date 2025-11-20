import AuthComponent from "./auth-button";
import Footer from "./footer";

export default function AuthScreen() {
    return (
        <div className="flex flex-col min-h-screen">
            <div className="flex flex-col flex-1 gap-8 items-center justify-center max-w-3xl mx-auto py-12 px-4 w-full">
                <AuthComponent />
                <p className="text-base-content max-w-xs text-center">
                    By signing up, you agree to our <a href="/legal#privacy-policy" className="underline">
                        Privacy Policy
                    </a> and <a href="/legal#terms-of-service" className="underline">
                        Terms of Service
                    </a>. We encourage you to read them carefully. They aren't long!
                </p>
                <p className="text-base-content/70"> See the <a href="/help" className="underline">help page</a> for more information. </p>
            </div>
            <Footer />
        </div>
    );
}
