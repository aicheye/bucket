import InnerLayout from "../courses/layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InnerLayout>{children}</InnerLayout>;
}
