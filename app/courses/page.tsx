import { redirect } from "next/navigation";

export default async function Page() {
  // Redirect default course index to dashboard
  redirect(`/dashboard`);
}
