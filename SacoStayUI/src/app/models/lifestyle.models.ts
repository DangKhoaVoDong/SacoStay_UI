export interface LifestyleOption {
  id: number;
  content: string;
}

export interface LifestyleQuestion {
  id: number;
  content: string;
  options: LifestyleOption[];
}

export interface SwipeDeckCard {
  userId: string;
  matchingScore: number;
}

/** POST /api/Lifestyle/question */
export interface CreateQuestionPayload {
  content: string;
  options: string[];
}

/** PUT /api/Lifestyle/question */
export interface UpdateQuestionPayload {
  id: number;
  content: string;
}

/** PUT /api/Lifestyle/options?questionId= */
export interface UpdateOptionPayload {
  optionId?: number | null;
  content: string;
}

/** Câu trả lời lối sống từ GET /api/Lifestyle/my-answers hoặc answers/{userId}. */
export interface UserLifestyleAnswer {
  questionId: number;
  questionContent: string;
  optionId: number;
  optionContent: string;
}
