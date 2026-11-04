import { t as __tr } from '@/shared/i18n';
import { sendFeedbackGoal } from '@/shared/analytics/metrika';
import { FEEDBACK_TOPICS, type FeedbackClient, type FeedbackRating } from '../domain/Feedback';

export class MetrikaFeedbackClient implements FeedbackClient {
  async submitRating(feedback: FeedbackRating): Promise<void> {
    if (
      !Number.isInteger(feedback.rating) ||
      feedback.rating < 1 ||
      feedback.rating > 5 ||
      !FEEDBACK_TOPICS.some((topic) => topic.value === feedback.topic) ||
      !['landing', 'workspace'].includes(feedback.surface)
    )
      throw new Error(__tr("Выберите оценку от 1 до 5 и тему отзыва."));
    // Deliberately allowlist fields: no free text, names, email, document IDs or URLs.
    await sendFeedbackGoal({
      rating: String(feedback.rating),
      topic: feedback.topic,
      surface: feedback.surface,
    });
  }
}

export const metrikaFeedbackClient: FeedbackClient = new MetrikaFeedbackClient();
