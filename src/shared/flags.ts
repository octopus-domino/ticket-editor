/* ============================================================
   shared/flags.ts
   NFR-OBS-05, MIG-STRAT-02, MIG-ROLLBACK-01.
   Feature flags из env. Откат = переключить переменную окружения
   без релиза.
   ============================================================ */

export const FLAGS = {
  /** F-DG-01..11: диаграмма draw.io. */
  FEATURE_DIAGRAM:
    import.meta.env.VITE_FEATURE_DIAGRAM !== 'false',

  /** F-STMP-E-01..26: модульный редактор штампа. */
  FEATURE_STAMP_EDITOR:
    import.meta.env.VITE_FEATURE_STAMP_EDITOR !== 'false',

  /** MIG-STRAT-02: новая реализация левой панели. */
  FEATURE_NEW_LEFT_PANEL:
    import.meta.env.VITE_FEATURE_NEW_LEFT_PANEL !== 'false',

  /** MIG-STRAT-02: новая реализация canvas. */
  FEATURE_NEW_CANVAS:
    import.meta.env.VITE_FEATURE_NEW_CANVAS === 'true',

  /** MIG-UI-01: баннер «сообщить о проблеме» (30 дней после rollout). */
  FEATURE_SHOW_MIGRATION_BANNER:
    import.meta.env.VITE_FEATURE_SHOW_MIGRATION_BANNER === 'true',

  /** MIG-UI-02: кнопка «переключиться на старую версию». */
  FEATURE_SHOW_ROLLBACK_BUTTON:
    import.meta.env.VITE_FEATURE_SHOW_ROLLBACK_BUTTON === 'true',
} as const;

export type FeatureFlag = keyof typeof FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FLAGS[flag];
}