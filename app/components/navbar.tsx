import Link from "next/link";
import Profile from "./profile";
import ThemeToggle from "./theme-toggle";

export default function Navbar({ showProfile = true }: { showProfile?: boolean }) {
    return (
        <div className="navbar bg-base-200 border-b border-base-content/10 px-4">
            <div className="flex-1">
                <Link href="/" className="font-bold text-xl">Bucket</Link>
            </div>
            <div className="flex flex-row gap-4">
                <ThemeToggle />
                {showProfile && <Profile />}
            </div>
        </div>
    );
}
