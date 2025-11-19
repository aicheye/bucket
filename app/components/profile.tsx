import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function Profile() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-center font-sans h-10 gap-3 min-w-full">
      <Image src={session!.user!.image!} alt={session!.user!.name!} className="rounded-full" width={40} height={40} />
      <button onClick={() => signOut({ callbackUrl: "/" })} className="btn btn-primary h-full rounded-4xl">
        Sign out
      </button>
    </div>
  );
}
