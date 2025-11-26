import { faBars } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import Profile from "./profile";
import ThemeToggle from "./theme-toggle";

export default function Navbar({
  showProfile = true,
  showMenuButton = false,
  className,
}: {
  showProfile?: boolean;
  showMenuButton?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`navbar bg-base-200 border-b border-base-content/10 ${className ?? ""}`}
    >
      <div className="flex-none lg:hidden">
        {showMenuButton && (
          <label
            htmlFor="my-drawer-2"
            aria-label="open sidebar"
            className="btn btn-ghost mr-2 btn-square"
          >
            <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          </label>
        )}
      </div>
      <div className="flex-1 mx-2">
        <Link
          href="/"
          className="font-bold text-xl flex items-center gap-2 w-fit"
        >
          Bucket
        </Link>
      </div>
      <div className="flex flex-row gap-2 mx-2">
        <ThemeToggle />
        {showProfile && <Profile />}
      </div>
    </div>
  );
}
