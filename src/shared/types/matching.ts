export type MatchStatus = 'MATCHED' | 'NEEDS_REVIEW' | 'MISSING' | 'AMBIGUOUS' | 'INCOMPATIBLE';

export interface MatchResult {
  fieldId: string;
  fieldLabel: string;
  matchedCategory: string;
  suggestedValue: string | null;
  status: MatchStatus;
  confidence: number;
  reason: string;
  requiresReview: boolean;
}
