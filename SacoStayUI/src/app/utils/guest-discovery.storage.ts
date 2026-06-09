import { FREE_WEEKLY_SWIPE_LIMIT } from './discovery-filters';
import type { LifestyleQuestion } from '../models/lifestyle.models';
import type { UserLifestyleAnswer, WishlistItem } from '../models/lifestyle.models';

const SESSION_KEY = 'saco_guest_discovery_v1';
const REGISTER_SYNC_KEY = 'saco_guest_register_sync';
const REGISTER_RETURN_URL_KEY = 'saco_guest_register_return_url';

export interface GuestSwipeRecord {
  userId: string;
  isLike: boolean;
  at: string;
}

export interface GuestDiscoverySession {
  version: 1;
  quizCompleted: boolean;
  selectedOptionIds: number[];
  answers: UserLifestyleAnswer[];
  swipes: GuestSwipeRecord[];
  wishlist: WishlistItem[];
  usedSwipesThisWeek: number;
  weekResetAt: string;
  pendingChat?: {
    userId: string;
    name: string;
    avatar: string;
  };
}

function emptySession(): GuestDiscoverySession {
  return {
    version: 1,
    quizCompleted: false,
    selectedOptionIds: [],
    answers: [],
    swipes: [],
    wishlist: [],
    usedSwipesThisWeek: 0,
    weekResetAt: nextWeekResetIso()
  };
}

function nextWeekResetIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

function readRaw(): GuestDiscoverySession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestDiscoverySession;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(session: GuestDiscoverySession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getGuestDiscoverySession(): GuestDiscoverySession {
  const session = readRaw() ?? emptySession();
  const resetAt = Date.parse(session.weekResetAt);
  if (!Number.isNaN(resetAt) && Date.now() >= resetAt) {
    session.usedSwipesThisWeek = 0;
    session.weekResetAt = nextWeekResetIso();
    write(session);
  }
  return session;
}

export function hasGuestQuizCompleted(): boolean {
  return getGuestDiscoverySession().quizCompleted;
}

export function clearGuestDiscoverySession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REGISTER_SYNC_KEY);
  localStorage.removeItem(REGISTER_RETURN_URL_KEY);
}

export function markGuestRegisterSync(returnUrl: string): void {
  localStorage.setItem(REGISTER_SYNC_KEY, '1');
  localStorage.setItem(REGISTER_RETURN_URL_KEY, returnUrl);
}

export function shouldSyncGuestAfterRegister(): boolean {
  return localStorage.getItem(REGISTER_SYNC_KEY) === '1';
}

export function consumeGuestRegisterReturnUrl(): string {
  const url = localStorage.getItem(REGISTER_RETURN_URL_KEY) ?? '/chat';
  localStorage.removeItem(REGISTER_RETURN_URL_KEY);
  localStorage.removeItem(REGISTER_SYNC_KEY);
  return url;
}

export function saveGuestQuizResult(
  questions: LifestyleQuestion[],
  answers: Map<number, number>,
  selectedOptionIds: number[]
): void {
  const built: UserLifestyleAnswer[] = [];
  for (const [questionId, optionId] of answers) {
    const q = questions.find((x) => x.id === questionId);
    const opt = q?.options.find((o) => o.id === optionId);
    if (!q || !opt) continue;
    built.push({
      questionId,
      questionContent: q.content,
      optionId,
      optionContent: opt.content
    });
  }

  const session = getGuestDiscoverySession();
  session.quizCompleted = true;
  session.selectedOptionIds = [...selectedOptionIds];
  session.answers = built.sort((a, b) => a.questionId - b.questionId);
  write(session);
}

export function getGuestAnswers(): UserLifestyleAnswer[] {
  return getGuestDiscoverySession().answers;
}

export function getGuestSelectedOptionIds(): number[] {
  return getGuestDiscoverySession().selectedOptionIds;
}

export function getGuestWishlist(): WishlistItem[] {
  return getGuestDiscoverySession().wishlist;
}

export function getGuestSwipeQuotaView(): {
  isPremium: false;
  weeklyLimit: number;
  usedThisWeek: number;
  remaining: number;
  weekResetAt: string;
} {
  const session = getGuestDiscoverySession();
  const remaining = Math.max(0, FREE_WEEKLY_SWIPE_LIMIT - session.usedSwipesThisWeek);
  return {
    isPremium: false,
    weeklyLimit: FREE_WEEKLY_SWIPE_LIMIT,
    usedThisWeek: session.usedSwipesThisWeek,
    remaining,
    weekResetAt: session.weekResetAt
  };
}

export function recordGuestSwipe(userId: string, isLike: boolean): void {
  const session = getGuestDiscoverySession();
  session.swipes = session.swipes.filter((s) => s.userId !== userId);
  session.swipes.push({ userId, isLike, at: new Date().toISOString() });
  if (!session.usedSwipesThisWeek) {
    session.usedSwipesThisWeek = 0;
  }
  session.usedSwipesThisWeek += 1;
  write(session);
}

export function addGuestWishlistItem(item: WishlistItem): void {
  const session = getGuestDiscoverySession();
  session.wishlist = session.wishlist.filter((w) => w.userId !== item.userId);
  session.wishlist = [item, ...session.wishlist];
  write(session);
}

export function removeGuestWishlistItem(userId: string): void {
  const session = getGuestDiscoverySession();
  session.wishlist = session.wishlist.filter((w) => w.userId !== userId);
  write(session);
}

export function setGuestPendingChat(userId: string, name: string, avatar: string): void {
  const session = getGuestDiscoverySession();
  session.pendingChat = { userId, name, avatar };
  write(session);
}

export function consumeGuestPendingChat(): GuestDiscoverySession['pendingChat'] | null {
  const session = getGuestDiscoverySession();
  const pending = session.pendingChat ?? null;
  if (pending) {
    session.pendingChat = undefined;
    write(session);
  }
  return pending;
}

export function getGuestSwipedUserIds(includeSwiped: boolean): Set<string> {
  if (includeSwiped) return new Set();
  const session = getGuestDiscoverySession();
  return new Set(session.swipes.map((s) => s.userId));
}
