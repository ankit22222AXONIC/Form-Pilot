import { describe, it, expect } from 'vitest';
import { matchingService } from './matching';
import type { AIAnalysisResponse, VaultData } from '../types';

describe('Matching Service', () => {
  const mockVaultData: VaultData = {
    personalDetails: {
      fullName: 'John Doe',
      firstName: 'John',
      middleName: '',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male'
    },
    contactInfo: {
      email: 'john@example.com',
      phone: '1234567890'
    },
    addressInfo: {
      houseNumber: '123',
      street: 'Main St',
      locality: 'Downtown',
      city: 'Metropolis',
      state: 'NY',
      pinCode: '10001',
      country: 'USA'
    },
    education: [],
    documents: [],
    apiKeys: []
  };

  it('matches exact and semantic fields correctly', async () => {
    const aiResponse: AIAnalysisResponse = {
      formTitle: 'Test',
      summary: 'Test',
      warnings: [],
      missingInformation: [],
      fields: [
        {
          fieldId: 'f1',
          originalLabel: 'Applicant Name',
          interpretedMeaning: 'Full name',
          category: 'personal_details',
          expectedFormat: 'text',
          required: true,
          confidence: 0.9,
          ambiguous: false,
          explanation: ''
        },
        {
          fieldId: 'f2',
          originalLabel: 'Email Address',
          interpretedMeaning: 'Email',
          category: 'contact_info',
          expectedFormat: 'email',
          required: true,
          confidence: 0.9,
          ambiguous: false,
          explanation: ''
        }
      ]
    };

    const results = await matchingService.matchFields(aiResponse, mockVaultData);
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('MATCHED');
    expect(results[0].suggestedValue).toBe('John Doe');
    expect(results[1].status).toBe('MATCHED');
    expect(results[1].suggestedValue).toBe('john@example.com');
  });

  it('handles missing data', async () => {
    const aiResponse: AIAnalysisResponse = {
      formTitle: 'Test',
      summary: 'Test',
      warnings: [],
      missingInformation: [],
      fields: [
        {
          fieldId: 'f1',
          originalLabel: 'Middle Name',
          interpretedMeaning: 'Middle name',
          category: 'personal_details',
          expectedFormat: 'text',
          required: false,
          confidence: 0.9,
          ambiguous: false,
          explanation: ''
        }
      ]
    };

    const results = await matchingService.matchFields(aiResponse, mockVaultData);
    expect(results[0].status).toBe('MISSING');
    expect(results[0].suggestedValue).toBeNull();
  });

  it('handles ambiguous AI fields', async () => {
    const aiResponse: AIAnalysisResponse = {
      formTitle: 'Test',
      summary: 'Test',
      warnings: [],
      missingInformation: [],
      fields: [
        {
          fieldId: 'f1',
          originalLabel: 'ID',
          interpretedMeaning: 'Identifier',
          category: 'unknown',
          expectedFormat: 'text',
          required: true,
          confidence: 0.2,
          ambiguous: true,
          explanation: 'Could be anything'
        }
      ]
    };

    const results = await matchingService.matchFields(aiResponse, mockVaultData);
    expect(results[0].status).toBe('AMBIGUOUS');
    expect(results[0].suggestedValue).toBeNull();
  });

  it('flags format incompatibility', async () => {
    const aiResponse: AIAnalysisResponse = {
      formTitle: 'Test',
      summary: 'Test',
      warnings: [],
      missingInformation: [],
      fields: [
        {
          fieldId: 'f1',
          originalLabel: 'DOB',
          interpretedMeaning: 'Date of birth',
          category: 'personal_details',
          expectedFormat: 'date',
          required: true,
          confidence: 0.9,
          ambiguous: false,
          explanation: ''
        }
      ]
    };

    // Valid format in vault
    let results = await matchingService.matchFields(aiResponse, mockVaultData);
    expect(results[0].status).toBe('MATCHED');
    expect(results[0].requiresReview).toBe(false);

    // Invalid format in vault
    const invalidVault = { ...mockVaultData, personalDetails: { ...mockVaultData.personalDetails!, dateOfBirth: 'First of Jan' } };
    results = await matchingService.matchFields(aiResponse, invalidVault);
    expect(results[0].status).toBe('INCOMPATIBLE');
    expect(results[0].requiresReview).toBe(true);
  });
});
