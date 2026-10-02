export interface AutofillOperation {
  fieldId: string;
  value: string;
}

export interface AutofillResult {
  fieldId: string;
  success: boolean;
  reason?: string;
}
