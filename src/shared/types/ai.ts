export type AIProvider = 'openai' | 'anthropic' | 'sarvam';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface AIFieldInterpretation {
  fieldId: string;
  originalLabel: string;
  interpretedMeaning: string;
  category: 'personal_details' | 'contact_info' | 'address_info' | 'education' | 'documents' | 'other' | 'unknown';
  expectedFormat: string;
  required: boolean;
  confidence: number;
  ambiguous: boolean;
  explanation: string;
}

export interface AIAnalysisResponse {
  formTitle: string;
  summary: string;
  fields: AIFieldInterpretation[];
  warnings: string[];
  missingInformation: string[];
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini', // fast, cheap, supports json_object
};
