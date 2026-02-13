/**
 * Theme colors – Janmat Canvas branding (pink/red from Janmat Party).
 * Primary used for main buttons, links, and focus ring.
 * After changing, sync --primary, --primary-foreground, --ring in globals.css :root for first-paint.
 */
export const theme = {
  primary: "#C41E5A",
  primaryForeground: "#ffffff",
  primaryMuted: "#E891B0",
  ring: "#D81B60",
} as const;

export type Theme = typeof theme;
