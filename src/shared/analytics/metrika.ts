type Metrika = ((id: number, method: string, ...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};
declare global {
  interface Window {
    ym?: Metrika;
  }
}

export function parseCounterId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

const counterId = parseCounterId(import.meta.env.VITE_YANDEX_METRIKA_ID);
let initialized = false;
let previousPath: string | null = null;

function initialize(): boolean {
  if (!import.meta.env.PROD || !counterId) return false;
  if (initialized) return true;
  const queue: Metrika = function (...args: unknown[]) {
    (queue.a ??= []).push(args);
  };
  queue.l = Date.now();
  window.ym ??= queue;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${counterId}`;
  document.head.append(script);
  // Do not record document contents, form values, resource IDs or query strings.
  window.ym(counterId, 'init', {
    defer: true,
    clickmap: false,
    trackLinks: false,
    webvisor: false,
    accurateTrackBounce: true,
    sendTitle: false,
  });
  initialized = true;
  return true;
}

export function analyticsPath(path: string): string {
  return path.replace(/\/(editor|templates|schemas)\/[^/]+/g, '/$1/:id');
}

export function trackPage(path: string): void {
  const safePath = analyticsPath(path);
  if (!initialize() || safePath === previousPath) return;
  window.ym?.(counterId!, 'hit', `${window.location.origin}${safePath}`, {
    title: safePath === '/' ? 'CoDoc — главная' : 'CoDoc',
    referer: previousPath ? `${window.location.origin}${previousPath}` : '',
  });
  previousPath = safePath;
}

export function reachGoal(
  goal:
    | 'start_template'
    | 'template_created'
    | 'template_saved'
    | 'schema_created'
    | 'model_created'
    | 'generation_started'
    | 'generation_completed'
    | 'generation_failed'
    | 'generation_cancelled'
    | 'feedback_opened'
    | 'feedback_form_opened',
  params?: Record<string, string>,
): void {
  try {
    if (initialize()) window.ym?.(counterId!, 'reachGoal', goal, params);
  } catch {
    // Analytics must never turn a successful application action into an error.
  }
}

/** Resolve only after the provider callback; blocked analytics must not look like success. */
export function sendFeedbackGoal(params: Record<string, string>): Promise<void> {
  if (!initialize())
    return Promise.reject(new Error('Сейчас отправка недоступна. Попробуйте позже.'));
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () =>
        reject(
          new Error(
            'Не удалось подтвердить отправку. Проверьте соединение или блокировщик рекламы.',
          ),
        ),
      12000,
    );
    try {
      window.ym?.(counterId!, 'reachGoal', 'feedback_rating_submitted', params, () => {
        window.clearTimeout(timeout);
        resolve();
      });
    } catch (reason) {
      window.clearTimeout(timeout);
      reject(reason);
    }
  });
}
