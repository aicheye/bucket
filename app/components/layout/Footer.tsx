"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import ExternalLink from "../ui/ExternalLink";

export default function Footer() {
  return (
    <footer
      className="bg-base-200 border-t border-base-content/10 flex-shrink-0"
      role="contentinfo"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto pl-2 pr-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Left: action links */}
        <div className="flex flex-wrap items-center gap-2">
          <ExternalLink
            href="https://github.com/aicheye/bucket"
            className="btn btn-ghost btn-sm gap-2"
            decorations="text-base-content/70"
            aria-label="GitHub repository"
          >
            <span className="text-lg">
              <FontAwesomeIcon
                icon={faGithub}
                className="w-4 h-4"
                aria-hidden="true"
              />
            </span>
            <span className="hidden lg:inline text-sm">GitHub</span>
          </ExternalLink>

          <ExternalLink
            href="mailto:sean@seanyang.me"
            className="btn btn-ghost btn-sm gap-2"
            decorations="text-base-content/70"
            aria-label="Email"
          >
            <span className="text-lg">
              <FontAwesomeIcon
                icon={faEnvelope}
                className="w-4 h-4"
                aria-hidden="true"
              />
            </span>
            <span className="hidden lg:inline text-sm">Email</span>
          </ExternalLink>

          <ExternalLink
            href="https://seanyang.me"
            className="btn btn-ghost btn-sm gap-2"
            decorations="text-base-content/70"
            aria-label="Website"
          >
            <span className="text-lg">
              <FontAwesomeIcon
                icon={faGlobe}
                className="w-4 h-4"
                aria-hidden="true"
              />
            </span>
            <span className="hidden lg:inline text-sm">Website</span>
          </ExternalLink>
        </div>

        {/* Right: legal / copy */}
        <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-base-content/70 text-center md:text-right">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Sean Yang</span>
            <span>•</span>
            <Link href="/legal/license" className="link">
              License
            </Link>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1">
            <Link href="/legal/privacy" className="link">
              Privacy
            </Link>
            &
            <Link href="/legal/terms" className="link">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
