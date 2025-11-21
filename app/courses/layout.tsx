"use client";

import { useSession } from "next-auth/react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import { CourseProvider } from "./course-context";


function InnerLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();

    return (
        <div className="flex flex-col h-screen">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col min-h-full p-8">
                        <div className="flex-1 flex flex-col gap-8 max-w-5xl mx-auto w-full text-base-content text-left">
                            {status === "loading" && !session ?
                                <div className="flex max-w-5xl h-full items-center justify-center">
                                    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full bg-base-100 p-8 rounded-box">
                                        <div className="skeleton h-8 w-1/3 mb-4"></div>
                                        <div className="skeleton h-64 w-full rounded-box"></div>
                                        <div className="skeleton h-64 w-full rounded-box"></div>
                                    </div>
                                </div> : children
                            }
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
    return (
        <CourseProvider>
            <InnerLayout>{children}</InnerLayout>
        </CourseProvider>
    );
}
