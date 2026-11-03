export const FEEDBACK_TOPICS = [
  { value: 'general', label: 'В целом о сервисе' },
  { value: 'templates', label: 'Создание шаблонов' },
  { value: 'data', label: 'Работа с данными' },
  { value: 'export', label: 'Генерация и скачивание' },
] as const;

export interface FeedbackRating {
  rating: number;
  topic: (typeof FEEDBACK_TOPICS)[number]['value'];
  surface: 'landing' | 'workspace';
}

export interface FeedbackClient {
  submitRating(feedback: FeedbackRating): Promise<void>;
}

export function yandexFormUrls(value: unknown): { publicUrl: string; embedUrl: string } | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !['forms.yandex.ru', 'forms.yandex.com'].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname === '/'
    )
      return null;
    url.hash = '';
    url.searchParams.delete('iframe');
    const publicUrl = url.toString();
    url.searchParams.set('iframe', '1');
    return { publicUrl, embedUrl: url.toString() };
  } catch {
    return null;
  }
}
