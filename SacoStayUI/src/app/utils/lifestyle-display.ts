import type { LifestyleQuestion } from '../models/lifestyle.models';
import type { UserLifestyleAnswer } from '../models/lifestyle.models';

export interface RoomQuestionPair {
  lifestyle: LifestyleQuestion[];
  roomStatus: LifestyleQuestion | null;
  roomPrice: LifestyleQuestion | null;
}

/** Hai câu cuối quiz (theo id tăng dần) = tình trạng phòng + giá phòng. */
export function resolveRoomQuestionPair(questions: LifestyleQuestion[]): RoomQuestionPair {
  const sorted = [...questions].sort((a, b) => a.id - b.id);
  if (sorted.length >= 2) {
    return {
      lifestyle: sorted.slice(0, -2),
      roomStatus: sorted[sorted.length - 2],
      roomPrice: sorted[sorted.length - 1]
    };
  }
  const roomStatus = sorted.find((q) => isRoomStatusQuestion(q.content)) ?? null;
  const roomPrice = sorted.find((q) => isRoomPriceQuestion(q.content)) ?? null;
  return {
    lifestyle: sorted.filter((q) => q.id !== roomStatus?.id && q.id !== roomPrice?.id),
    roomStatus,
    roomPrice
  };
}

export function resolveRoomQuestionPairFromAnswers(answers: UserLifestyleAnswer[]): {
  roomStatus: UserLifestyleAnswer | null;
  roomPrice: UserLifestyleAnswer | null;
} {
  const sorted = [...answers].sort((a, b) => a.questionId - b.questionId);
  if (sorted.length >= 2) {
    return {
      roomStatus: sorted[sorted.length - 2],
      roomPrice: sorted[sorted.length - 1]
    };
  }
  return {
    roomStatus: sorted.find((a) => isRoomStatusQuestion(a.questionContent)) ?? null,
    roomPrice: sorted.find((a) => isRoomPriceQuestion(a.questionContent)) ?? null
  };
}

export function compatibilityColorClass(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
  { pattern: /giờ|giấc|ngủ/i, label: 'Giờ giấc' },
  { pattern: /tiếng ồn|ồn ào/i, label: 'Tiếng ồn' },
  { pattern: /hút thuốc|thuốc lá/i, label: 'Hút thuốc' },
  { pattern: /nấu ăn|bếp/i, label: 'Nấu ăn' },
  { pattern: /cuối tuần|weekend/i, label: 'Cuối tuần' },
  { pattern: /vệ sinh|dọn/i, label: 'Vệ sinh' },
  { pattern: /khách|bạn bè/i, label: 'Khách khứa' },
  { pattern: /thú cưng|pet/i, label: 'Thú cưng' },
  { pattern: /làm tại nhà|work from home|wfh/i, label: 'Làm tại nhà' },
  { pattern: /chia sẻ|đồ dùng/i, label: 'Chia sẻ đồ' },
  { pattern: /phòng trọ|tình trạng phòng|đang ở/i, label: 'Tình trạng phòng' },
  { pattern: /giá phòng|ngân sách|mức giá/i, label: 'Giá phòng' }
];

export function lifestyleCategoryLabel(questionContent: string): string {
  const q = questionContent.trim();
  for (const { pattern, label } of CATEGORY_RULES) {
    if (pattern.test(q)) return label;
  }
  return q.length > 36 ? `${q.slice(0, 36)}…` : q;
}

export function isRoomStatusQuestion(questionContent: string): boolean {
  const c = questionContent.toLowerCase();
  if (c.includes('tình trạng phòng')) return true;
  if (c.includes('phòng trọ') || c.includes('phòng ở')) return true;
  if (c.includes('tìm được') && c.includes('phòng')) return true;
  if (c.includes('đã có') && c.includes('phòng')) return true;
  if (c.includes('có phòng')) return true;
  return c.includes('phòng') && (c.includes('trọ') || c.includes('thuê'));
}

export function isRoomPriceQuestion(questionContent: string): boolean {
  const c = questionContent.toLowerCase();
  if (c.includes('tiền trọ') || c.includes('tiền phòng')) return true;
  if (c.includes('giá') && (c.includes('phòng') || c.includes('trọ') || c.includes('thuê'))) return true;
  return (c.includes('mức giá') || c.includes('ngân sách')) && (c.includes('phòng') || c.includes('trọ'));
}

/** Option "Có / đã có phòng" ở câu tình trạng phòng. */
export function isHasRoomYesOption(optionContent: string): boolean {
  const opt = optionContent.toLowerCase().trim();
  if (opt.includes('chưa')) return false;
  if (opt.includes('không')) return false;
  return (
    opt.includes('đã có') ||
    opt.includes('có phòng') ||
    opt.includes('đang thuê') ||
    opt === 'có' ||
    opt.startsWith('có ')
  );
}

export function lifestyleAnswersForDisplay(answers: UserLifestyleAnswer[]): UserLifestyleAnswer[] {
  return answers.filter((a) => !isRoomStatusQuestion(a.questionContent) && !isRoomPriceQuestion(a.questionContent));
}

export interface RoomStatusView {
  hasRoom: boolean;
  priceLabel?: string;
}

export function roomStatusFromAnswers(answers: UserLifestyleAnswer[]): RoomStatusView {
  let hasRoom = false;
  let priceLabel: string | undefined;

  const { roomStatus, roomPrice } = resolveRoomQuestionPairFromAnswers(answers);

  if (roomStatus) {
    hasRoom = isHasRoomYesOption(roomStatus.optionContent);
  } else {
    for (const a of answers) {
      if (isRoomStatusQuestion(a.questionContent)) {
        hasRoom = isHasRoomYesOption(a.optionContent);
      }
    }
  }

  if (roomPrice && hasRoom) {
    priceLabel = roomPrice.optionContent.trim();
  } else {
    for (const a of answers) {
      if (isRoomPriceQuestion(a.questionContent)) {
        priceLabel = a.optionContent.trim();
      }
    }
    if (!hasRoom) priceLabel = undefined;
  }

  return { hasRoom, priceLabel };
}

export function jobLabelVi(job: string | null | undefined): string {
  const j = (job ?? '').trim().toLowerCase();
  if (!j) return 'Chưa cập nhật';
  if (j === 'student' || j.includes('sinh viên')) return 'Sinh viên';
  if (j === 'fresher' || j.includes('mới đi làm')) return 'Mới đi làm';
  if (j === 'working' || j.includes('đi làm')) return 'Đã đi làm';
  return job ?? 'Chưa cập nhật';
}

export function genderLabelVi(gender: unknown): string {
  if (gender === true || gender === 'male') return 'Nam';
  if (gender === false || gender === 'female') return 'Nữ';
  return 'Khác';
}

export function ageFromDateOfBirth(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age > 0 && age < 120 ? age : null;
}

export function discoveryHighlightTags(
  myAnswers: UserLifestyleAnswer[],
  theirAnswers: UserLifestyleAnswer[],
  max = 2
): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const theirs of theirAnswers) {
    if (isRoomStatusQuestion(theirs.questionContent) || isRoomPriceQuestion(theirs.questionContent)) {
      continue;
    }
    const mine = myAnswers.find((m) => m.questionId === theirs.questionId);
    if (!mine || mine.optionId !== theirs.optionId) continue;
    const label = theirs.optionContent.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    tags.push(label);
    if (tags.length >= max) return tags;
  }

  for (const theirs of lifestyleAnswersForDisplay(theirAnswers)) {
    const label = theirs.optionContent.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    tags.push(label);
    if (tags.length >= max) break;
  }

  return tags;
}

export function roomStatusBadge(hasRoom: boolean): string {
  return hasRoom ? 'Đã có phòng' : 'Chưa có phòng trọ';
}

export function isVerifiedUser(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return false;
  const s = String(user['verificationStatus'] ?? user['VerificationStatus'] ?? '').toLowerCase();
  return s === 'verified' || s === 'approved' || s === 'completed';
}
