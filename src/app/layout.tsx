import React from "react";
import type { Metadata } from "next";
import { ThemeInjector } from "@/components/ThemeInjector";
import "./globals.css";

export const metadata: Metadata = {
  title: "Janmat Canvas",
  description: "Janmat poster editor with Nepali support",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeInjector />
        {children}
      </body>
    </html>
  );
}