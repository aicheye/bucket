"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SnowContextType {
  isSnowEnabled: boolean;
  toggleSnow: () => void;
}

const SnowContext = createContext<SnowContextType | undefined>(undefined);

export function SnowProvider({ children }: { children: React.ReactNode }) {
  const [isSnowEnabled, setIsSnowEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("snow-effect");
    if (saved !== null) {
      setIsSnowEnabled(saved === "true");
    }
  }, []);

  const toggleSnow = () => {
    setIsSnowEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("snow-effect", String(newValue));
      return newValue;
    });
  };

  return (
    <SnowContext.Provider value={{ isSnowEnabled, toggleSnow }}>
      {children}
    </SnowContext.Provider>
  );
}

export function useSnow() {
  const context = useContext(SnowContext);
  if (context === undefined) {
    throw new Error("useSnow must be used within a SnowProvider");
  }
  return context;
}
