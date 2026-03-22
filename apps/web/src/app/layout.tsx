import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { GlobalAppShell } from "@/components/nav/GlobalAppShell";

export const metadata: Metadata = {
  title: "XLayout - Editor Profesional",
  description: "Plataforma profesional para diseño de layouts en 2D y 3D.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalAppShell>{children}</GlobalAppShell>
      </body>
    </html>
  );
}
