/**
 * Creado y diseñado por XO
 * XLayout — Studio Layout (xlayout.studio)
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout del workspace/editor. Orientado a productividad.
 * Siempre requiere autenticación.
 */

"use client";

import { GlobalAppShell } from "@/components/nav/GlobalAppShell";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Todas las rutas de studio requieren autenticación
  return <GlobalAppShell>{children}</GlobalAppShell>;
}
