"use client";

import { useSession } from "next-auth/react";
import AuthComponent from "./auth-button";
import Footer from "./footer";
import Navbar from "./navbar";

export default function AuthScreen() {
    const { status } = useSession();

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar showProfile={false} />
            <div className="flex flex-col flex-1 gap-8 items-center justify-center max-w-3xl mx-auto py-12 px-4 w-full">
                {status === "loading" ? <div className="loading loading-spinner loading-lg"></div> : (
                    <>
                        <AuthComponent />
                        <p className="text-base-content max-w-s text-md text-center">
                            By signing up, you agree to our <a href="/legal/privacy" className="link link-primary" target="_blank" rel="noopener noreferrer">
                                Privacy Policy
                            </a> and <a href="/legal/terms" className="link link-primary" target="_blank" rel="noopener noreferrer">
                                Terms of Service </a>.<br />
                            We encourage you to read them carefully. They aren&apos;t long!
                        </p>
                        <p className="text-base-content/70 text-md text-center"> See the <a target="_blank" href="/help" className="link link-primary">
                            help page</a> for more information on how to use the service.
                        </p>
                    </>
                )}
            </div>
            <Footer />
        </div>
    );
}
