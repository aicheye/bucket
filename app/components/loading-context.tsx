"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type LoadingContextType = {
  loading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
  setLoading: (v: boolean) => void;
};

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoadingState] = useState(false);

  const showLoading = useCallback(() => setLoadingState(true), []);
  const hideLoading = useCallback(() => setLoadingState(false), []);
  const setLoading = useCallback((v: boolean) => setLoadingState(!!v), []);

  return (
    <LoadingContext.Provider
      value={{ loading, showLoading, hideLoading, setLoading }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}

export default LoadingContext;
