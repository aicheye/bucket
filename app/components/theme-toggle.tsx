"use client";

import { faBrush } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

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

    const applyTheme = (selectedTheme: string) => {
        let themeToApply = selectedTheme;
        if (selectedTheme === "system") {
            themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
    };

    return (
        <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost">
                <FontAwesomeIcon icon={faBrush} className="w-5 h-5" /> {theme.charAt(0).toUpperCase() + theme.slice(1)}
                <svg
                    width="12px"
                    height="12px"
                    className="h-2 w-2 fill-current opacity-60 inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 2048 2048"
                >
                    <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
                </svg>
            </div>
            <ul
                tabIndex={0}
                className="dropdown-content z-[1] p-2 shadow-2xl bg-base-300 rounded-box w-52 h-96 overflow-y-auto border border-base-content/10"
            >
                {themes.map((t) => (
                    <li key={t}>
                        <button
                            className={`btn btn-sm btn-block justify-start ${theme === t ? "btn-primary" : "btn-ghost"
                                }`}
                            onClick={() => handleThemeChange(t)}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
