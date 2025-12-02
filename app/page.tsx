"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_NAME } from "../lib/constants";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    document.title = APP_NAME;
  }, [session]);

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/api/auth/signin");
    }
  }, [session, router]);

  return null;
}
