/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * Barrel export del módulo Intent Engine (Fase 4)
 * ═══════════════════════════════════════════════════════════════════ */

export type {
  IntentType,
  IntentContext,
  IntentOutput,
  IntentHint,
  IntentPreferences,
  SuggestedAction,
  SnapMode,
  UiSuppressionFlags,
} from './intent-types';

export { IDLE_OUTPUT, DEFAULT_PREFERENCES } from './intent-types';
export { resolveIntent } from './intent-engine';
export { useIntentStore } from './intent-store';
export { ALL_RULES } from './intent-rules';
