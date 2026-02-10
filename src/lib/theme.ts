/**
 * Theme colors – edit this file to change the app theme.
 * Green is used minimally: only primary (main buttons, links) and focus ring.
 * Backgrounds, cards, and text stay neutral.
 * After changing, sync --primary, --primary-foreground, --ring in globals.css :root for first-paint.
 */
export const theme = {
  primary: "#2E6B4E",
  primaryForeground: "#ffffff",
  primaryMuted: "#80BDA5",
  ring: "#3d8a66",
} as const;

export type Theme = typeof theme;
