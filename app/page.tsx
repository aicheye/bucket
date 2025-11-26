"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthScreen from "./components/auth";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      document.title = "Bucket";
    } else {
      document.title = "Bucket — Sign in";
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (!session) {
    return <AuthScreen />;
  }

  return null;
}
