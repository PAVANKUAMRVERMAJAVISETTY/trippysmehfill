import { Feedback } from '../types';

/** A single review's score: the mean of its four sub-ratings. */
export function feedbackScore(entry: Feedback): number {
  return (entry.food_rating + entry.taste_rating + entry.packing_rating + entry.delivery_rating) / 4;
}

/**
 * Average score across all reviews, to one decimal. `fallback` is shown while
 * no feedback exists yet.
 */
export function averageFeedbackRating(feedback: Feedback[], fallback: string): string {
  if (feedback.length === 0) return fallback;
  const total = feedback.reduce((sum, entry) => sum + feedbackScore(entry), 0);
  return (total / feedback.length).toFixed(1);
}
