"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthScreen from "../../../components/auth";

function ErrorAuth() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return <AuthScreen error={error} />;
}

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthScreen />}>
      <ErrorAuth />
    </Suspense>
  );
}
