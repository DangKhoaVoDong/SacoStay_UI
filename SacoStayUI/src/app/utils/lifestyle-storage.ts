const LEGACY_DONE_KEY = 'saco_lifestyle_completed';
const LEGACY_SWIPE_KEY = 'saco_swipe_data';

export interface SwipeData {
  count: number;
  resetDate: string;
}

function doneKey(userId: string): string {
  return `saco_lifestyle_completed_${userId}`;
}

function swipeKey(userId: string): string {
  return `saco_swipe_data_${userId}`;
}

export function clearLegacyLifestyleKeys(): void {
  sessionStorage.removeItem(LEGACY_DONE_KEY);
  localStorage.removeItem(LEGACY_SWIPE_KEY);
}

/**
 * Cờ hoàn thành quiz trên FE (sau POST /api/Lifestyle/submit thành công).
 * Câu trả lời thật nằm trên DB; cờ local giúp không phải làm lại sau đăng xuất.
 */
export function hasCompletedLifestyleQuiz(userId: string): boolean {
  if (!userId) return false;
  return localStorage.getItem(doneKey(userId)) === '1';
}

export function setLifestyleQuizCompleted(userId: string): void {
  if (!userId) return;
  localStorage.setItem(doneKey(userId), '1');
}

export function clearSwipeDataForUser(userId: string): void {
  if (!userId) return;
  localStorage.removeItem(swipeKey(userId));
}

export function loadSwipeData(userId: string): SwipeData {
  if (!userId) {
    return { count: 0, resetDate: new Date().toISOString() };
  }
  const raw = localStorage.getItem(swipeKey(userId));
  if (!raw) {
    return { count: 0, resetDate: new Date().toISOString() };
  }
  try {
    const data = JSON.parse(raw) as SwipeData;
    const resetDate = new Date(data.resetDate);
    const days = Math.floor((Date.now() - resetDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 7) {
      return { count: 0, resetDate: new Date().toISOString() };
    }
    return { count: Number(data.count) || 0, resetDate: data.resetDate };
  } catch {
    return { count: 0, resetDate: new Date().toISOString() };
  }
}

export function saveSwipeData(userId: string, data: SwipeData): void {
  if (!userId) return;
  localStorage.setItem(swipeKey(userId), JSON.stringify(data));
}
