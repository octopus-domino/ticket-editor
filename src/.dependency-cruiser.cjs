/* eslint-env node */
/**
 * ARC-LAYER-07: правила слоёв enforced в CI.
 *
 * Лayers (снизу вверх):
 *   shared  →  lib  →  domain  →  application  →  infrastructure | presentation  →  app (main/App)
 *
 * shared и lib — «фундамент»: не тянут вверх.
 * domain — framework-free (никаких react/konva/tiptap/immer).
 * application — не тянет presentation, не тянет infra-реализации.
 * infrastructure — не тянет presentation, не тянет application.
 * presentation — не тянет app-entrypoint.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'ARC-LAYER-08: циклические зависимости запрещены.',
      from: {},
      to: { circular: true },
    },

    /* shared — на самом дне. */
    {
      name: 'shared-no-upward',
      severity: 'error',
      comment: 'shared может импортировать только shared и npm.',
      from: { path: '^src/shared/' },
      to: {
        path: '^src/(lib|domain|application|infrastructure|presentation|App\\.tsx|main\\.tsx)',
      },
    },

    /* lib — над shared, ниже domain. */
    {
      name: 'lib-no-upward',
      severity: 'error',
      comment: 'lib может импортировать только lib и shared.',
      from: { path: '^src/lib/' },
      to: {
        path: '^src/(domain|application|infrastructure|presentation|App\\.tsx|main\\.tsx)',
      },
    },

    /* domain — framework-free + без верхних слоёв. */
    {
      name: 'domain-framework-free',
      severity: 'error',
      comment: 'ARC-LAYER-02: domain не тянет react/konva/tiptap/zustand.',
      from: { path: '^src/domain/' },
      to: {
        module: '^(react|react-dom|react-konva|konva|@tiptap/.+|zustand|immer)$',
      },
    },
    {
      name: 'domain-no-upper',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: {
        path: '^src/(application|infrastructure|presentation|App\\.tsx|main\\.tsx)',
      },
    },

    /* application — не тянет ui. */
    {
      name: 'application-no-ui',
      severity: 'error',
      comment: 'ARC-LAYER-03: application не импортирует presentation.',
      from: { path: '^src/application/' },
      to: { path: '^src/(presentation|App\\.tsx|main\\.tsx)' },
    },

    /* infrastructure — не тянет ui и application. */
    {
      name: 'infrastructure-no-upper',
      severity: 'error',
      comment: 'ARC-LAYER-04: infrastructure не импортирует ui/application.',
      from: { path: '^src/infrastructure/' },
      to: { path: '^src/(application|presentation|App\\.tsx|main\\.tsx)' },
    },

    /* presentation — не тянет app-entrypoint. */
    {
      name: 'presentation-no-app',
      severity: 'error',
      from: { path: '^src/presentation/' },
      to: { path: '^src/(App\\.tsx|main\\.tsx)' },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: './tsconfig.json' },
    combinedDependencies: false,
    exclude: {
      path: 'node_modules|\\.test\\.(ts|tsx)$|\\.spec\\.(ts|tsx)$',
    },
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+' },
      archi: { collapsePattern: '^(node_modules|src/(shared|lib|domain|application|infrastructure|presentation|templates|workers))/' },
    },
  },
};