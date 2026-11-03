import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  delete window.ym;
  document.querySelectorAll('script[src*="mc.yandex.ru"]').forEach((node) => node.remove());
});

describe('feedback delivery', () => {
  it('logs goal calls and callbacks only when diagnostics are explicitly enabled', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '114057241');
    window.history.replaceState({}, '', '/?codoc_metrics_debug=1');
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const ym = vi.fn();
    window.ym = ym;
    const { reachGoal } = await import('@/shared/analytics/metrika');
    window.history.replaceState({}, '', '/app/schemas/new');
    reachGoal('schema_created', { field_count: '2' });
    expect(log).toHaveBeenCalledWith('[CoDoc metrics]', 'goal_called', {
      counterId: 114057241,
      goal: 'schema_created',
      params: { field_count: '2' },
    });
    expect(log).not.toHaveBeenCalledWith('[CoDoc metrics]', 'goal_callback', expect.anything());
    const goal = ym.mock.calls.find((call) => call[1] === 'reachGoal');
    (goal?.[4] as () => void)();
    expect(log).toHaveBeenCalledWith('[CoDoc metrics]', 'goal_callback', {
      counterId: 114057241,
      goal: 'schema_created',
    });
  });
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
