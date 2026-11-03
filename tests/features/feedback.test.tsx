import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FeedbackWidget } from '@/features/feedback/ui/FeedbackWidget';
import { yandexFormUrls } from '@/features/feedback/domain/Feedback';

const formUrl = 'https://forms.yandex.ru/u/6aea2bde49af470247e9dcf9/';

describe('cloud feedback', () => {
  it('validates the cloud form origin and builds the embed URL', () => {
    expect(yandexFormUrls(formUrl)).toEqual({
      publicUrl: formUrl,
      embedUrl: `${formUrl}?iframe=1`,
    });
    for (const value of [
      '',
      'javascript:alert(1)',
      'https://forms.yandex.ru.evil.test/u/1',
      'https://user@forms.yandex.ru/u/1',
      'http://forms.yandex.ru/u/1',
    ]) {
      expect(yandexFormUrls(value)).toBeNull();
    }
  });

  it('opens only on demand and loads the third-party form only on request', () => {
    render(
      <FeedbackWidget surface="landing" formUrl={formUrl} client={{ submitRating: vi.fn() }} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Обратная связь' }));
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Хочу написать подробнее →' }));
    expect(screen.getByTitle('Подробный отзыв о CoDoc')).toHaveAttribute(
      'src',
      `${formUrl}?iframe=1`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть обратную связь' }));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('sends only the rating, topic and surface and prevents a duplicate submission', async () => {
    const submitRating = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackWidget surface="workspace" client={{ submitRating }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Обратная связь' }));
    expect(screen.getByRole('button', { name: 'Отправить оценку' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Оценка 4 из 5' }));
    fireEvent.change(screen.getByLabelText('О чём отзыв?'), { target: { value: 'templates' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить оценку' }));
    await screen.findByText('Спасибо за вашу оценку!');
    expect(submitRating).toHaveBeenCalledOnce();
    expect(submitRating).toHaveBeenCalledWith({
      rating: 4,
      topic: 'templates',
      surface: 'workspace',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Вернуться к работе' }));
    fireEvent.click(screen.getByRole('button', { name: 'Обратная связь' }));
    expect(screen.queryByRole('button', { name: 'Отправить оценку' })).toBeNull();
  });

  it('keeps the rating and allows retry after a failed send', async () => {
    const submitRating = vi
      .fn()
      .mockRejectedValueOnce(new Error('Нет соединения'))
      .mockResolvedValueOnce(undefined);
    render(<FeedbackWidget surface="landing" client={{ submitRating }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Обратная связь' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Оценка 2 из 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отправить оценку' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Нет соединения'));
    expect(screen.queryByText('Спасибо за вашу оценку!')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Оценка 2 из 5' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Отправить оценку' }));
    await screen.findByText('Спасибо за вашу оценку!');
  });
});
