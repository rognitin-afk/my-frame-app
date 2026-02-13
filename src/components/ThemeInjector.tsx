"use client";

import { useEffect } from "react";
import { theme } from "@/lib/theme";

/**
 * Injects theme from src/lib/theme.ts into CSS variables.
 * Janmat Canvas theme (primary + ring).
 */
export function ThemeInjector() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--primary-foreground", theme.primaryForeground);
    root.style.setProperty("--ring", theme.ring);
  }, []);
  return null;
}
