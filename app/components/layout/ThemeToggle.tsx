"use client";

import {
  faBrush,
  faDesktop,
  faMoon,
  faSun,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef, useState } from "react";
import { sendTelemetry } from "../../../lib/telemetry";

const themes = [
  "system",
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState("system");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const applyTheme = (selectedTheme: string) => {
    let themeToApply = selectedTheme;
    if (selectedTheme === "system") {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-theme", themeToApply);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
    sendTelemetry("toggle_theme", { theme: newTheme });
    setOpen(false);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!rootRef.current.contains(target)) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className={`dropdown dropdown-end ${open ? "dropdown-open" : ""}`}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Theme options"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onClick={(e) => e.preventDefault()}
      >
        <FontAwesomeIcon
          icon={
            theme === "system"
              ? faDesktop
              : theme === "light"
                ? faSun
                : theme === "dark"
                  ? faMoon
                  : faBrush
          }
          className="w-5 h-5"
          aria-hidden="true"
          focusable={false}
        />{" "}
        <span className="hidden md:block">
          {theme.charAt(0).toUpperCase() + theme.slice(1)}
        </span>
        <svg
          width="12px"
          height="12px"
          className="ml-1 h-2 w-2 fill-current opacity-60 inline-block"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 2048 2048"
          aria-hidden="true"
          focusable={false}
        >
          <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
        </svg>
      </button>
      <ul
        tabIndex={0}
        role="menu"
        aria-label="Theme selection"
        className="mt-1 dropdown-content z-50 p-2 shadow-2xl bg-base-300 rounded-box w-52 h-96 overflow-y-auto border border-base-content/10"
      >
        {themes.map((t) => (
          <li key={t}>
            <button
              className={`btn btn-sm btn-block justify-start ${theme === t ? "btn-primary" : "btn-ghost"
                }`}
              role="menuitem"
              type="button"
              onClick={() => handleThemeChange(t)}
            >
              {t === "system" ? (
                <FontAwesomeIcon
                  icon={faDesktop}
                  className="w-4 h-4"
                  aria-hidden="true"
                />
              ) : null}
              {t === "light" ? (
                <FontAwesomeIcon
                  icon={faSun}
                  className="w-4 h-4"
                  aria-hidden="true"
                />
              ) : null}
              {t === "dark" ? (
                <FontAwesomeIcon
                  icon={faMoon}
                  className="w-4 h-4"
                  aria-hidden="true"
                />
              ) : null}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


