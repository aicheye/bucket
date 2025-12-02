import InnerLayout from "../courses/layout";

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InnerLayout>{children}</InnerLayout>;
}
