"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-base-200 border-t border-base-content/10" role="contentinfo">
      <div className="mx-auto px-4 py-4 sm:py-2 flex flex-col md:flex-row md:py-1 items-center justify-between gap-2">
        {/* Left: action links */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://github.com/aicheye/bucket"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm gap-2"
            aria-label="GitHub repository"
          >
            <span className="text-lg"><FontAwesomeIcon icon={faGithub} className="w-4 h-4" /></span>
            <span className="hidden lg:inline text-sm">GitHub</span>
          </a>

          <a
            href="mailto:sean@seanyang.me"
            className="btn btn-ghost btn-sm gap-2"
            aria-label="Email"
          >
            <span className="text-lg"><FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" /></span>
            <span className="hidden lg:inline text-sm">Email</span>
          </a>

          <a
            href="https://seanyang.me"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm gap-2"
            aria-label="Website"
          >
            <span className="text-lg"><FontAwesomeIcon icon={faGlobe} className="w-4 h-4" /></span>
            <span className="hidden lg:inline text-sm">Website</span>
          </a>
        </div>

        {/* Right: legal / copy */}
        <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-base-content/70 text-center md:text-right">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Sean Yang</span>
            <span>•</span>
            <a className="link" href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
              MIT
            </a>
            <span>•</span>
            <a className="link" href="https://scripts.sil.org/OFL" target="_blank" rel="noopener noreferrer">
              SIL OFL 1.1
            </a>
          </div>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <Link href="/legal/privacy" className="link">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/legal/terms" className="link">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
