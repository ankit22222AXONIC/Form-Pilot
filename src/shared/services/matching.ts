import type { AIAnalysisResponse, VaultData, MatchResult, AIFieldInterpretation } from '../types';

export const matchingService = {
  async matchFields(analysis: AIAnalysisResponse, vaultData: VaultData): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    for (const field of analysis.fields) {
      results.push(this._matchSingleField(field, vaultData));
    }

    return results;
  },

  _matchSingleField(field: AIFieldInterpretation, vaultData: VaultData): MatchResult {
    const labelLower = (field.interpretedMeaning || field.originalLabel || '').toLowerCase();
    
    if (field.ambiguous) {
      return {
        fieldId: field.fieldId,
        fieldLabel: field.originalLabel,
        matchedCategory: field.category,
        suggestedValue: null,
        status: 'AMBIGUOUS',
        confidence: field.confidence,
        reason: 'AI flagged this field as ambiguous: ' + field.explanation,
        requiresReview: true
      };
    }

    // Try finding exact/semantic match
    let match: { value: string, reason: string, status?: 'MATCHED' | 'INCOMPATIBLE' | 'MISSING' } | null = null;

    if (field.category === 'personal_details' && vaultData.personalDetails) {
      if (this._matchesAny(labelLower, ['first name', 'given name'])) {
        match = this._checkValue(vaultData.personalDetails.firstName, 'Semantic match with first name');
      } else if (this._matchesAny(labelLower, ['last name', 'surname', 'family name'])) {
        match = this._checkValue(vaultData.personalDetails.lastName, 'Semantic match with last name');
      } else if (this._matchesAny(labelLower, ['middle name'])) {
        match = this._checkValue(vaultData.personalDetails.middleName, 'Semantic match with middle name');
      } else if (this._matchesAny(labelLower, ['full name', 'name', 'applicant name'])) {
        match = this._checkValue(vaultData.personalDetails.fullName, 'Semantic match with full name');
      } else if (this._matchesAny(labelLower, ['dob', 'date of birth', 'birth date'])) {
        match = this._checkValue(vaultData.personalDetails.dateOfBirth, 'Semantic match with date of birth');
        if (match.value && field.expectedFormat === 'date' && !this._isValidDateFormat(match.value)) {
           match.status = 'INCOMPATIBLE';
           match.reason = 'Format incompatibility: requires valid date format';
        }
      } else if (this._matchesAny(labelLower, ['gender', 'sex'])) {
        match = this._checkValue(vaultData.personalDetails.gender || '', 'Semantic match with gender');
      }
    } else if (field.category === 'contact_info' && vaultData.contactInfo) {
      if (this._matchesAny(labelLower, ['email', 'email address', 'e-mail'])) {
        match = this._checkValue(vaultData.contactInfo.email, 'Semantic match with email address');
      } else if (this._matchesAny(labelLower, ['phone', 'mobile', 'cell', 'phone number', 'contact number'])) {
        match = this._checkValue(vaultData.contactInfo.phone, 'Semantic match with phone number');
      }
    } else if (field.category === 'address_info' && vaultData.addressInfo) {
      if (this._matchesAny(labelLower, ['address', 'address line 1', 'street'])) {
        match = this._checkValue(vaultData.addressInfo.street, 'Semantic match with street address');
      } else if (this._matchesAny(labelLower, ['house number', 'flat number', 'apartment'])) {
        match = this._checkValue(vaultData.addressInfo.houseNumber, 'Semantic match with house number');
      } else if (this._matchesAny(labelLower, ['city', 'town', 'district'])) {
        match = this._checkValue(vaultData.addressInfo.city, 'Semantic match with city');
      } else if (this._matchesAny(labelLower, ['state', 'province'])) {
        match = this._checkValue(vaultData.addressInfo.state, 'Semantic match with state');
      } else if (this._matchesAny(labelLower, ['zip', 'zip code', 'pin', 'pin code', 'pincode', 'postal code'])) {
        match = this._checkValue(vaultData.addressInfo.pinCode, 'Semantic match with postal code');
      } else if (this._matchesAny(labelLower, ['country', 'nation'])) {
        match = this._checkValue(vaultData.addressInfo.country, 'Semantic match with country');
      }
    } else if (field.category === 'education') {
      if (vaultData.education.length > 1) {
        return {
          fieldId: field.fieldId,
          fieldLabel: field.originalLabel,
          matchedCategory: field.category,
          suggestedValue: null,
          status: 'AMBIGUOUS',
          confidence: 0.5,
          reason: 'Multiple education records found. Manual selection required.',
          requiresReview: true
        };
      } else if (vaultData.education.length === 1) {
         if (this._matchesAny(labelLower, ['institution', 'school', 'college', 'university'])) {
           match = this._checkValue(vaultData.education[0].institutionName, 'Semantic match with institution');
         } else if (this._matchesAny(labelLower, ['qualification', 'degree', 'course'])) {
           match = this._checkValue(vaultData.education[0].qualification, 'Semantic match with qualification');
         }
      }
    }

    if (!match) {
      return {
        fieldId: field.fieldId,
        fieldLabel: field.originalLabel,
        matchedCategory: field.category,
        suggestedValue: null,
        status: 'MISSING',
        confidence: 0,
        reason: 'No matching category or field found in vault.',
        requiresReview: true
      };
    }

    if (match.status === 'MISSING') {
      return {
        fieldId: field.fieldId,
        fieldLabel: field.originalLabel,
        matchedCategory: field.category,
        suggestedValue: null,
        status: 'MISSING',
        confidence: 0.9,
        reason: 'Information is missing from the vault.',
        requiresReview: true
      };
    }

    return {
      fieldId: field.fieldId,
      fieldLabel: field.originalLabel,
      matchedCategory: field.category,
      suggestedValue: match.value,
      status: match.status || 'MATCHED',
      confidence: 0.98,
      reason: match.reason,
      requiresReview: match.status === 'INCOMPATIBLE'
    };
  },

  _matchesAny(target: string, possibilities: string[]): boolean {
    return possibilities.some(p => target.includes(p));
  },

  _checkValue(val: string | undefined | null, reason: string) {
    if (!val || val.trim() === '') {
      return { value: '', reason, status: 'MISSING' as const };
    }
    return { value: val, reason, status: 'MATCHED' as const };
  },

  _isValidDateFormat(val: string): boolean {
    // Basic date check YYYY-MM-DD or DD/MM/YYYY
    return !isNaN(Date.parse(val)) || /^\d{2}\/\d{2}\/\d{4}$/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val);
  }
};
