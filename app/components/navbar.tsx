import Link from "next/link";
import Profile from "./profile";

interface NavbarProps {
  // No props needed for now
}

export default function Navbar({}: NavbarProps) {
  return (
    <div className="navbar bg-base-100 border-b border-base-content/10 px-4">
      <div className="flex-1">
        <Link href="/" className="font-bold normal-case text-xl">Bucket</Link>
      </div>
      <div className="flex-none gap-2">
        <Profile />
      </div>
    </div>
  );
}
