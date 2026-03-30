/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * IntentHints — Overlay de pistas visuales del Intent Engine
 *
 * Muestra hints discretos y contextuales basados en la intención
 * detectada. Se oculta automáticamente durante la navegación.
 *
 * Principios:
 * - No invasivo: hints discretos en la parte inferior del canvas
 * - No ruidoso: máximo 1 hint visible a la vez
 * - Útil: atajos y acciones relevantes
 * ═══════════════════════════════════════════════════════════════════ */

'use client';

import React, { useEffect, useState } from 'react';
import { useIntentStore } from '@/intent/intent-store';
import './intent-hints.css';

export const IntentHints: React.FC = () => {
  const output = useIntentStore((s) => s.output);
  const preferences = useIntentStore((s) => s.preferences);
  const [visible, setVisible] = useState(false);
  const [displayedMessage, setDisplayedMessage] = useState('');

  /* ── Gestionar visibilidad y transiciones suaves ── */
  useEffect(() => {
    // No mostrar si está deshabilitado, suprimido, o sin hints
    if (
      !preferences.enabled ||
      !preferences.showHints ||
      output.suppression.suppressHints ||
      output.hints.length === 0
    ) {
      setVisible(false);
      return;
    }

    // Tomar solo el primer hint (máximo 1 visible a la vez)
    const hint = output.hints[0];
    if (hint && hint.message !== displayedMessage) {
      setDisplayedMessage(hint.message);
      setVisible(true);
    }

    // Si el hint tiene duración, auto-ocultar
    if (hint && hint.duration > 0) {
      const timeout = setTimeout(() => setVisible(false), hint.duration);
      return () => clearTimeout(timeout);
    }
  }, [output.hints, output.suppression.suppressHints, preferences.enabled, preferences.showHints, displayedMessage]);

  /* ── Ocultar cuando no hay hints ── */
  useEffect(() => {
    if (output.hints.length === 0) {
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [output.hints.length]);

  if (!preferences.enabled || !preferences.showHints) return null;

  return (
    <div
      className={`intent-hints ${visible ? 'intent-hints--visible' : ''}`}
      aria-live="polite"
      role="status"
    >
      <div className="intent-hints__pill">
        <span className="intent-hints__icon">💡</span>
        <span className="intent-hints__text">{displayedMessage}</span>
      </div>
    </div>
  );
};
