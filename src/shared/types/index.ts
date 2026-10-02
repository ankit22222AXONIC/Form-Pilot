export interface FormField {
  id: string;
  name: string;
  type: string;
}

export interface PersonalDetails {
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  alternatePhone?: string;
}

export interface AddressInfo {
  houseNumber: string;
  street: string;
  locality: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface EducationInfo {
  id: string;
  institutionName: string;
  qualification: string;
  boardUniversity: string;
  yearOfCompletion: string;
  rollNumber?: string;
}

export interface DocumentInfo {
  id: string;
  documentType: string;
  documentLabel: string;
  referenceNumber?: string;
}

export interface ApiKeyInfo {
  id: string;
  providerName: string;
  keyLabel: string;
  keyValue: string;
}

export interface VaultData {
  personalDetails: PersonalDetails | null;
  contactInfo: ContactInfo | null;
  addressInfo: AddressInfo | null;
  education: EducationInfo[];
  documents: DocumentInfo[];
  apiKeys: ApiKeyInfo[];
}

export * from './ai';
export * from './matching';
export * from './autofill';
export * from './trust';
