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
