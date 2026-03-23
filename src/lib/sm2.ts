/**
 * SM-2 Spaced Repetition Algorithm
 * Quality ratings: 0-5 (0=complete blackout, 5=perfect response)
 * We simplify to: 0=wrong, 3=hard, 4=good, 5=easy
 */

export interface SM2Card {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
}

export interface SM2Result {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
}

export function calculateSM2(
  card: SM2Card,
  quality: number // 0-5
): SM2Result {
  let { ease_factor, interval, repetitions } = card;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease_factor);
    }
    repetitions += 1;
  } else {
    // Incorrect - reset
    repetitions = 0;
    interval = 0;
  }

  // Update ease factor
  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease_factor < 1.3) ease_factor = 1.3;

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval,
    repetitions,
    next_review: next.toISOString(),
  };
}

export function isDueForReview(nextReview: string): boolean {
  return new Date(nextReview) <= new Date();
}

export function getMasteryLevel(card: { ease_factor: number; repetitions: number; times_correct: number; times_incorrect: number }): 'new' | 'learning' | 'reviewing' | 'mastered' {
  const total = card.times_correct + card.times_incorrect;
  if (total === 0) return 'new';
  if (card.repetitions < 2) return 'learning';
  if (card.repetitions >= 5 && card.ease_factor >= 2.5) return 'mastered';
  return 'reviewing';
}

export const MASTERY_COLORS = {
  new: 'bg-muted text-muted-foreground',
  learning: 'bg-accent/15 text-accent-foreground',
  reviewing: 'bg-primary/10 text-primary',
  mastered: 'bg-success/10 text-success',
} as const;

export const MASTERY_LABELS = {
  new: 'Novo',
  learning: 'Aprendendo',
  reviewing: 'Revisando',
  mastered: 'Dominado',
} as const;
