import { lifestyleAnswersForDisplay } from './lifestyle-display';
import type { UserLifestyleAnswer } from '../models/lifestyle.models';

/** Tính % hòa hợp phía FE (guest chưa có bản ghi trên DB). */
export function computeLifestyleMatchPercent(
  myAnswers: UserLifestyleAnswer[],
  theirAnswers: UserLifestyleAnswer[]
): number {
  const mine = lifestyleAnswersForDisplay(myAnswers);
  const theirs = lifestyleAnswersForDisplay(theirAnswers);
  if (!mine.length || !theirs.length) return 0;

  const theirByQuestion = new Map(theirs.map((a) => [a.questionId, a.optionId]));
  let matched = 0;
  let total = 0;

  for (const answer of mine) {
    const theirOptionId = theirByQuestion.get(answer.questionId);
    if (theirOptionId === undefined) continue;
    total += 1;
    if (theirOptionId === answer.optionId) matched += 1;
  }

  if (!total) return 0;
  return Math.round((matched / total) * 100);
}
