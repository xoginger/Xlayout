/**
 * Creado y diseñado por XO
 * XLayout — Layout raíz con identidad visual oficial
 */

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

export const metadata: Metadata = {
  title: "XLayout — Plataforma Profesional de Diseño",
  description: "Diseña, configura y cotiza espacios con precisión profesional. Catálogos conectados, editor CAD en 2D y 3D, y operación comercial integrada.",
  manifest: '/manifest.json',
  themeColor: '#1D4ED8',
  icons: {
    icon: [
      { url: '/xlayout-icon-x.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
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
        {children}
      </body>
    </html>
  );
}
