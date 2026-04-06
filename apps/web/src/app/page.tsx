/**
 * Creado y diseñado por XO
 * XLayout — Root page fallback
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo solo existe como fallback. Las solicitudes reales llegan
 * a /site/page.tsx o /studio/page.tsx gracias al middleware de dominio.
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/site');
}
