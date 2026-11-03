import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
  delete window.ym;
  document.querySelectorAll('script[src*="mc.yandex.ru"]').forEach((node) => node.remove());
});

describe('feedback delivery', () => {
  it('does not let a failing analytics provider break business actions', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '114057241');
    window.ym = vi.fn(() => {
      throw new Error('provider unavailable');
    });
    const { reachGoal } = await import('@/shared/analytics/metrika');
    expect(() => reachGoal('schema_created', { field_count: '1' })).not.toThrow();
  });
  it('does not report success until Metrika calls back', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '114057241');
    const ym = vi.fn();
    window.ym = ym;
    const { sendFeedbackGoal } = await import('@/shared/analytics/metrika');
    const confirmed = vi.fn();
    const sent = sendFeedbackGoal({ rating: '5', topic: 'general', surface: 'landing' }).then(
      confirmed,
    );
    expect(confirmed).not.toHaveBeenCalled();
    const goal = ym.mock.calls.find((call) => call[1] === 'reachGoal');
    expect(goal?.slice(0, 3)).toEqual([114057241, 'reachGoal', 'feedback_rating_submitted']);
    (goal?.[4] as () => void)();
    await sent;
    expect(confirmed).toHaveBeenCalledOnce();
  });

  it('rejects when a blocker or network failure prevents confirmation', async () => {
    vi.useFakeTimers();
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '114057241');
    window.ym = vi.fn();
    const { sendFeedbackGoal } = await import('@/shared/analytics/metrika');
    const sent = sendFeedbackGoal({ rating: '1' });
    const rejected = expect(sent).rejects.toThrow('Не удалось подтвердить отправку');
    await vi.advanceTimersByTimeAsync(12000);
    await rejected;
  });
});
