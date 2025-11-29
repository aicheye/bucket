"use client";

import { useSearchParams } from "next/navigation";
import AuthScreen from "../../../components/auth";

export default function SignInPage() {
  const searchParams = useSearchParams();

  return (
    <AuthScreen error={searchParams.get("error")} />
  );
}

