"use client";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/courses");
    }
  }, [session, router]);

  return (
    <div className="text-center">
      <div className="flex min-h-screen items-center justify-center">
        <button onClick={() => signIn("google", { callbackUrl: "/courses" })} className="btn btn-primary">
          Sign in with <FontAwesomeIcon icon={faGoogle} className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
