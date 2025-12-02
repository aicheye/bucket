"use client";

import { useLoading } from "../../contexts/LoadingContext";

export default function GlobalLoading() {
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div
      aria-hidden={!loading}
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div className="relative z-50 flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white">Processing…</div>
      </div>
    </div>
  );
}
