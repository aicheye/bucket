"use client";

import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import AuthComponent from "./auth-button";

export default function AuthScreen({ error }: { error?: string | string[] }) {
  const { status } = useSession();

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
            <AuthComponent />

            <p className="text-base-content text-md font-medium text-center">
              Bucket helps you organize your courses, track grades and
              assignments, and plan your term — all in one place. See the{" "}
              <a target="_blank" href="/help" className="link link-primary">
                help page
              </a>{" "}
              for more information on how to use the service.
            </p>
            <p className="text-base-content/80 text-sm text-center">
              By signing up, you agree to our{" "}
              <a
                href="/legal/privacy"
                className="link link-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="/legal/terms"
                className="link link-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>
              . We encourage you to read them carefully. They aren&apos;t long!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
