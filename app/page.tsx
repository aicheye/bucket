"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_NAME } from "../lib/constants";
import Footer from "./components/layout/Footer";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="loading loading-spinner loading-lg"></div>
      <Footer />
    </div>
  );
}
