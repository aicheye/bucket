"use client";

import InnerLayout from "../components/layout/InnerLayout";

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InnerLayout>{children}</InnerLayout>;
}
