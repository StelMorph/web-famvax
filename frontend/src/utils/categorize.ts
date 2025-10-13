// src/utils/categorize.ts
import { startOfDay, addDays, isSameDay, isBefore } from 'date-fns';

export type Category = 'overdue' | 'today' | 'upcoming' | 'nodate' | 'completed';

export function categorize(
  due: Date | null | undefined,
  completedAt?: Date | null,
  now: Date = new Date(),
  upcomingDays: number = 7,
): Category {
  if (completedAt) return 'completed';
  if (!due) return 'nodate';

  const start = startOfDay(now);
  const dueStart = startOfDay(due);

  if (isBefore(dueStart, start)) return 'overdue';
  if (isSameDay(dueStart, start)) return 'today';

  const limit = addDays(start, upcomingDays);
  return isBefore(dueStart, addDays(limit, 1)) ? 'upcoming' : 'nodate';
}
