import { redirect } from "next/navigation";

export default function Page({ params }: { params: { id: string } }) {
  // Redirect default course index to grades view
  redirect(`/courses/${params.id}/grades`);
}
