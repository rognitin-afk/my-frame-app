"use client";

import { useEffect } from "react";
import { theme } from "@/lib/theme";

/**
 * Injects theme from src/lib/theme.ts into CSS variables.
 * Edit theme.ts to change colors; green is used minimally (primary + ring only).
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
