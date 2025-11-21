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
            <div className="flex flex-col flex-1 gap-8 items-center justify-center mx-auto py-12 px-4 prose max-w-prose w-full">
                {status === "loading" ? <div className="loading loading-spinner loading-lg"></div> : (
                    <>
                        <AuthComponent />
                        <p className="text-base-content text-md font-medium text-center">
                            Bucket helps you organize your courses, track grades and assignments, and plan your term — all in one place. See the <a target="_blank" href="/help" className="link link-primary">
                                help page</a> for more information on how to use the service.
                        </p>
                        <p className="text-base-content/80 text-sm text-center">
                            By signing up, you agree to our <a href="/legal/privacy" className="link link-primary" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="/legal/terms" className="link link-primary" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
                            We encourage you to read them carefully. They aren&apos;t long!
                        </p>
                    </>
                )
                }
            </div >
            <Footer />
        </div >
    );
}
