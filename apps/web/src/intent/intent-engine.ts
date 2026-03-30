/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * Motor de Resolución de Intención — Fase 4
 *
 * Función pura que recibe un IntentContext, evalúa TODAS las reglas
 * determinísticas y retorna el IntentOutput con la intención ganadora.
 *
 * ✅ Sin estado
 * ✅ Sin side-effects
 * ✅ Testeable
 * ✅ Determinístico
 * ═══════════════════════════════════════════════════════════════════ */

import type { IntentContext, IntentOutput, UiSuppressionFlags } from './intent-types';
import { IDLE_OUTPUT } from './intent-types';
import { ALL_RULES, type RuleResult } from './intent-rules';

/**
 * Evalúa todas las reglas y retorna la intención de mayor confianza.
 *
 * @param ctx — Contexto completo del editor
 * @param previousIntent — Intención previa (para transiciones suaves)
 * @param minConfidence — Umbral mínimo de confianza (default 0.25)
 */
export function resolveIntent(
  ctx: IntentContext,
  previousIntent: IntentOutput['intent'] = 'idle',
  minConfidence: number = 0.25,
): IntentOutput {
  /* ── Evaluar todas las reglas ────────────────────────────── */
  const results: RuleResult[] = ALL_RULES.map((rule) => rule(ctx));

  /* ── Seleccionar la de mayor confianza ──────────────────── */
  let winner: RuleResult | null = null;

  for (const result of results) {
    if (result.confidence < minConfidence) continue;
    if (!winner || result.confidence > winner.confidence) {
      winner = result;
    }
  }

  /* ── Sin ganador → idle ─────────────────────────────────── */
  if (!winner) {
    return {
      ...IDLE_OUTPUT,
      previousIntent,
    };
  }

  /* ── Histéresis: mantener la intención previa si la nueva
       tiene confianza solo marginalmente mayor (evita flicker) ── */
  const prevResult = results.find((r) => r.intent === previousIntent);
  if (
    prevResult &&
    prevResult.confidence >= minConfidence &&
    winner.intent !== previousIntent &&
    winner.confidence - prevResult.confidence < 0.15
  ) {
    // La intención previa aún es válida y la nueva no es mucho mejor
    winner = prevResult;
  }

  /* ── Construir output ───────────────────────────────────── */
  const suppression: UiSuppressionFlags = {
    suppressOverlays: winner.suppression.suppressOverlays ?? false,
    suppressSnap: winner.suppression.suppressSnap ?? false,
    suppressInspector: winner.suppression.suppressInspector ?? false,
    suppressHints: winner.suppression.suppressHints ?? false,
  };

  return {
    intent: winner.intent,
    confidence: winner.confidence,
    previousIntent,
    suggestedActions: winner.actions,
    snapMode: winner.snapMode,
    hints: winner.hints,
    suppression,
    intentLabel: winner.label,
  };
}
