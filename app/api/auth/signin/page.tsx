"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { APP_NAME } from "../../../../lib/constants";
import AuthButton from "../../../components/ui/AuthButton";

function AuthPage({ error }: { error?: string | string[] }) {
  const { status } = useSession();

  useEffect(() => {
    document.title = `Sign In - ${APP_NAME}`;
  }, []);

  return (
    <div className="flex-1 h-full flex flex-col justify-center items-center">
      {error && (
        <div className="alert alert-error w-full mx-auto flex items-center gap-4 text-sm py-4 px-2 sm:px-4 sm:justify-start justify-center rounded-none absolute top-[calc(var(--navbar-height))] left-0">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="h-6 w-6 shrink-0"
          />
          <span>
            Error, please try again:{" "}
            {Array.isArray(error) ? error.join(" ") : error}
          </span>
        </div>
      )}
      <div className="flex flex-col flex-1 gap-8 items-center justify-center mx-auto py-12 px-4 prose max-w-prose w-full">
        {status === "loading" ? (
          <div className="loading loading-spinner loading-lg"></div>
        ) : (
          <>
            <AuthButton />

            <p className="text-base-content text-md font-medium text-center">
              {APP_NAME} helps you organize your courses, track grades and
              assignments, and plan your term — all in one place. See the{" "}
              <Link target="_blank" href="/help" className="link link-primary">
                help page
              </Link>{" "}
              for more information on how to use the service.
            </p>
            <p className="text-base-content/80 text-sm text-center">
              By signing up, you agree to our{" "}
              <Link
                href="/legal/privacy"
                className="link link-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/terms"
                className="link link-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </Link>
              . We encourage you to read them carefully. They aren&apos;t long!
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorAuth() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return <AuthPage error={error} />;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthPage />}>
      <ErrorAuth />
    </Suspense>
  );
}
