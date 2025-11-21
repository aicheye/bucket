import { faBars, faGauge } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import Profile from "./profile";
import ThemeToggle from "./theme-toggle";

export default function Navbar({ showProfile = true, showMenuButton = false }: { showProfile?: boolean, showMenuButton?: boolean }) {
    return (
        <div className="navbar bg-base-200 border-b border-base-content/10 px-4">
            <div className="flex-none lg:hidden mr-2">
                {showMenuButton && (
                    <label htmlFor="my-drawer-2" aria-label="open sidebar" className="btn btn-square btn-ghost">
                        <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
                    </label>
                )}
            </div>
            <div className="flex-1">
                <Link href="/" className="font-bold text-xl flex items-center gap-2">
                    <FontAwesomeIcon icon={faGauge} className="w-5 h-5" />
                    Bucket
                </Link>
            </div>
            <div className="flex flex-row gap-4">
                <ThemeToggle />
                {showProfile && <Profile />}
            </div>
        </div>
    );
}
