import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Redirect default course index to grades view
  const { id } = await params;
  redirect(`/courses/${id}/grades`);
}
