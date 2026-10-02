export type TrustRiskStatus =
  | 'NO_OBVIOUS_WARNINGS'
  | 'CAUTION'
  | 'HIGH_RISK'
  | 'UNABLE_TO_VERIFY';

export const TRUST_STATUS_LABELS: Record<TrustRiskStatus, string> = {
  NO_OBVIOUS_WARNINGS: 'No obvious warning signs detected',
  CAUTION: 'Caution — suspicious indicators found',
  HIGH_RISK: 'High risk — strong indicators of possible fraud',
  UNABLE_TO_VERIFY: 'Unable to verify — insufficient evidence',
};

export interface TrustFinding {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

export interface WebsiteTrustAnalysis {
  status: TrustRiskStatus;
  statusLabel: string;
  domain: string;
  fullUrl: string;
  protocol: string;
  isHttps: boolean;
  confidence: 'preliminary' | 'moderate' | 'high';
  findings: TrustFinding[];
  reasons: string[];
  recommendation: string;
  externalReputationChecked: boolean;
  reputationProviderName?: string;
  assessmentType: 'local_heuristics' | 'reputation_service' | 'hybrid';
  disclaimer: string;
}

export interface FormActionSignal {
  formId: string;
  formName: string;
  actionUrl: string;
  method: string;
  isExternalDestination: boolean;
  destinationDomain?: string;
  isInsecureAction: boolean;
}

export interface WebsiteAnalysisInput {
  url: string;
  pageTitle?: string;
  forms?: Array<{
    id: string;
    name: string;
    action?: string;
    method?: string;
    fields?: Array<{
      id: string;
      label: string;
      type: string;
      name?: string;
    }>;
  }>;
}

export interface ReputationProvider {
  name: string;
  isConfigured(): Promise<boolean>;
  checkDomain(domain: string): Promise<{
    status: TrustRiskStatus;
    findings: TrustFinding[];
    confidence: 'preliminary' | 'moderate' | 'high';
  } | null>;
}
