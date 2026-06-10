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

/** Nhãn ngắn theo id câu (22 = tình trạng phòng, 23 = giá phòng — khớp DB hiện tại). */
const QUESTION_LABEL_BY_ID: Record<number, string> = {
  2: 'Giờ Giấc',
  5: 'Mức độ sạch sẽ của người ở ghép',
  7: 'Mong muốn mối quan hệ với người ở ghép',
  11: 'Tiêu chí lựa chọn người ở ghép',
  22: 'Tình trạng phòng',
  23: 'Ngân sách thuê phòng'
};

/** Thứ tự quan trọng: câu dài / cụ thể trước, tránh trùng nhãn chung. */
const CATEGORY_RULES: { pattern: RegExp; label: string }[] = [
  { pattern: /tình trạng phòng|đã có phòng|chưa có phòng|đang tìm phòng/i, label: 'Tình trạng phòng' },
  { pattern: /giá phòng|ngân sách|mức giá|tiền trọ|tiền phòng/i, label: 'Ngân sách thuê' },
  { pattern: /giờ.*(ngủ|về|sinh hoạt)|giờ giấc|thức khuya|dậy sớm/i, label: 'Giờ Giấc' },
  {
    pattern: /thoải mái.*(hút thuốc|người hút)|sống cùng.*(người )?hút thuốc|cảm thấy thoải mái.*hút thuốc/i,
    label: 'Thoải mái khi ở gần người hút thuốc'
  },
  { pattern: /học tập|làm việc.*(nhà|tại nhà)|wfh|work from home/i, label: 'Học / làm việc tại nhà' },
  { pattern: /môi trường sống|yên tĩnh|tiếng ồn|ồn ào/i, label: 'Môi trường sống' },
  { pattern: /gọn gàng|ngăn nắp/i, label: 'Gọn gàng & ngăn nắp' },
  { pattern: /mức độ sạch sẽ.*roommate|sạch sẽ.*đồng phòng|kỳ vọng.*sạch/i, label: 'Kỳ vọng vệ sinh' },
  { pattern: /vệ sinh|dọn dẹp|lau chùi/i, label: 'Vệ sinh chung' },
  { pattern: /nấu ăn|bếp|nồi niêu/i, label: 'Nấu ăn' },
  { pattern: /tần suất.*khách|khách.*thường xuyên|khách.*bao lâu/i, label: 'Tần suất khách' },
  { pattern: /khách|bạn bè.*(qua|nhà|đến)/i, label: 'Khách đến nhà' },
  { pattern: /(^bạn )?có hút thuốc|bạn hút thuốc|thói quen hút thuốc|hút thuốc không|hút thuốc hay/i, label: 'Hút thuốc' },
  { pattern: /hút thuốc|thuốc lá/i, label: 'Hút thuốc' },
  { pattern: /thú cưng|pet/i, label: 'Thú cưng' },
  { pattern: /mối quan hệ.*roommate|quan hệ.*đồng phòng/i, label: 'Quan hệ với roommate' },
  { pattern: /góp ý|phản hồi.*roommate|nhắc nhở/i, label: 'Cách góp ý' },
  { pattern: /không gian riêng|riêng tư/i, label: 'Không gian riêng' },
  { pattern: /trách nhiệm|đúng hạn|chia việc|hóa đơn/i, label: 'Trách nhiệm chung' },
  { pattern: /bất đồng|tranh chấp|mâu thuẫn/i, label: 'Xử lý bất đồng' },
  { pattern: /căng thẳng|mệt mỏi|stress/i, label: 'Khi căng thẳng' },
  { pattern: /cảm thấy.*roommate.*(đồ|dùng)|dùng chung.*đồ|mượn đồ/i, label: 'Dùng chung đồ' },
  { pattern: /roommate.*(vào phòng|phòng ngủ|không gian)/i, label: 'Vào phòng riêng' },
  { pattern: /chia sẻ.*(tiền|điện|nước)|chi phí chung/i, label: 'Chia chi phí' },
  { pattern: /chia sẻ|đồ dùng/i, label: 'Chia sẻ đồ dùng' },
  { pattern: /cuối tuần|weekend/i, label: 'Cuối tuần' },
  { pattern: /nghe nhạc|tiệc|party|giải trí/i, label: 'Giải trí' },
  { pattern: /roommate/i, label: 'Thói quen đồng phòng' },
  { pattern: /làm tại nhà/i, label: 'Làm tại nhà' },
  { pattern: /phòng trọ|đang ở/i, label: 'Tình trạng phòng' }
];

function shortenQuestionFallback(questionContent: string): string {
  const q = questionContent.trim();
  if (!q) return 'Lối sống';
  const cleaned = q
    .replace(/^bạn\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[?.!]+$/g, '');
  if (cleaned.length <= 42) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return `${cleaned.slice(0, 40).trim()}…`;
}

export function lifestyleCategoryLabel(questionContent: string): string {
  const q = questionContent.trim();
  for (const { pattern, label } of CATEGORY_RULES) {
    if (pattern.test(q)) return label;
  }
  return shortenQuestionFallback(q);
}

/** Nhãn hiển thị cho một câu trả lời (ưu tiên id, sau đó nội dung câu hỏi). */
export function lifestyleAnswerLabel(answer: UserLifestyleAnswer): string {
  const byId = QUESTION_LABEL_BY_ID[answer.questionId];
  if (byId) return byId;
  return lifestyleCategoryLabel(answer.questionContent);
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
  if (user['isVerified'] === true || user['IsVerified'] === true) return true;
  const s = String(user['verificationStatus'] ?? user['VerificationStatus'] ?? '').toLowerCase();
  return s === 'verified' || s === 'approved' || s === 'completed';
}
