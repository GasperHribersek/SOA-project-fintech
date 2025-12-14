"use client";

import { useEffect } from "react";

export function SonnerStyles() {
  useEffect(() => {
    // Dynamically import sonner CSS
    import("sonner/dist/sonner.css").catch(() => {
      // Silently fail if CSS can't be loaded
      console.warn("Could not load sonner CSS");
    });
  }, []);

  return null;
}
