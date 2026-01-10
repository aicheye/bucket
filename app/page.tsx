"use client";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  return (
    <div className="flex flex-col h-full w-full items-center justify-center">
      <div className="flex-1 loading loading-spinner loading-lg"></div>
    </div>
  );
}
