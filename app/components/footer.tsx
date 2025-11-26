"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Footer() {
  return (
    <footer className="p-4 bg-base-200 text-base-content border-t border-base-content/10 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href="https://github.com/aicheye/bucket"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm gap-2 text-lg"
        >
          <FontAwesomeIcon icon={faGithub} className="w-4 h-4" />
          <span className="hidden lg:block text-sm">GitHub</span>
        </a>
        <a
          href="mailto:sean@seanyang.me"
          className="btn btn-ghost btn-sm gap-2 text-lg"
        >
          <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
          <span className="hidden lg:block text-sm">Email</span>
        </a>
        <a
          href="https://seanyang.me"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm gap-2 text-lg"
        >
          <FontAwesomeIcon icon={faGlobe} className="w-4 h-4" />
          <span className="hidden lg:block text-sm">Website</span>
        </a>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-sm opacity-70 text-center md:text-right">
        <p>
          Copyright © {new Date().getFullYear()} Sean Yang{" "}
          <a
            className="link"
            href="https://opensource.org/licenses/MIT"
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT License
          </a>
          , Icons from FontAwesome{" "}
          <a
            className="link"
            href="https://scripts.sil.org/OFL"
            target="_blank"
            rel="noopener noreferrer"
          >
            SIL OFL 1.1
          </a>
        </p>
        <div className="hidden md:block border-l h-4 border-base-content/20"></div>
        <p>
          Read our{" "}
          <a
            target="_blank"
            href="/legal/privacy"
            className="link"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>{" "}
          &{" "}
          <a
            target="_blank"
            href="/legal/terms"
            className="link"
            rel="noopener noreferrer"
          >
            Terms of Service
          </a>
        </p>
      </div>
    </footer>
  );
}
