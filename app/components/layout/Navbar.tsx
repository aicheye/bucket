"use client";

import { faBars, faFillDrip } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { APP_NAME, APP_VERSION } from "../../../lib/constants";
import Profile from "./Profile";
import ThemeToggle from "./ThemeToggle";

function closeDrawer() {
  const drawerCheckbox = document.getElementById(
    "my-drawer-2",
  ) as HTMLInputElement;
  if (drawerCheckbox) {
    drawerCheckbox.checked = false;
  }
}

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
      className={`navbar bg-base-200 border-b border-base-content/10 px-4 ${className ?? ""}`}
    >
      <div className="navbar-inner w-full">
        <div className="flex-none lg:hidden">
          {showMenuButton && (
            <label
              htmlFor="my-drawer-2"
              aria-label="open sidebar"
              className="btn btn-ghost mr-2 btn-square"
            >
              <FontAwesomeIcon
                icon={faBars}
                className="w-5 h-5"
                aria-hidden="true"
              />
            </label>
          )}
        </div>
        <div className="flex-1 flex flex-row items-center gap-2">
          <div className="flex btn btn-ghost normal-case text-xl w-fit p-0">
            <Link
              href="/"
              className="font-bold text-xl flex items-center gap-2 w-fit py-0 px-2"
              onClick={closeDrawer}
            >
              <FontAwesomeIcon
                icon={faFillDrip}
                className="w-6 h-6"
                aria-hidden="true"
              />
              <span className="flex items-baseline gap-2">
                {APP_NAME}{" "}
                <span className="text-sm text-gray-500 font-semibold italic">
                  {APP_VERSION}
                </span>
              </span>
            </Link>
          </div>
        </div>
        <div className="flex flex-row gap-2 mx-2">
          <ThemeToggle />
          {showProfile && <Profile />}
        </div>
      </div>
    </div>
  );
}
