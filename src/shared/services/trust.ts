import type {
  WebsiteAnalysisInput,
  WebsiteTrustAnalysis,
  TrustFinding,
  TrustRiskStatus,
  ReputationProvider
} from '../types';
import { TRUST_STATUS_LABELS } from '../types';

// High-value brands frequently targeted in phishing / typosquatting campaigns
const KNOWN_BRANDS: Record<string, string[]> = {
  paypal: ['paypal.com'],
  google: ['google.com', 'accounts.google.com'],
  apple: ['apple.com', 'icloud.com'],
  microsoft: ['microsoft.com', 'live.com', 'office.com', 'outlook.com', 'microsoftonline.com'],
  amazon: ['amazon.com', 'amazon.co.uk', 'amazon.in', 'amazon.de'],
  netflix: ['netflix.com'],
  facebook: ['facebook.com', 'meta.com'],
  instagram: ['instagram.com'],
  chase: ['chase.com'],
  bankofamerica: ['bankofamerica.com'],
  wellsfargo: ['wellsfargo.com'],
  citibank: ['citi.com', 'citibank.com'],
  binance: ['binance.com'],
  coinbase: ['coinbase.com'],
  dropbox: ['dropbox.com'],
  irs: ['irs.gov'],
  usps: ['usps.com'],
  fedex: ['fedex.com'],
  dhl: ['dhl.com']
};

// Common leetspeak substitutions used by typosquatters
const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'l', // or 'i'
  '3': 'e',
  '4': 'a',
  '5': 's',
  '8': 'b',
  '@': 'a',
  'vv': 'w'
};

function normalizeLeet(str: string): string {
  let normalized = str.toLowerCase();
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    normalized = normalized.replaceAll(leet, char);
  }
  return normalized;
}

function getApexDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return hostname;
  // Handle common 2-part ccTLDs like .co.uk, .com.au, .gov.in
  const secondLast = parts[parts.length - 2];
  if (['co', 'com', 'org', 'net', 'gov', 'edu'].includes(secondLast) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

let activeReputationProvider: ReputationProvider | null = null;

export const trustService = {
  registerReputationProvider(provider: ReputationProvider | null) {
    activeReputationProvider = provider;
  },

  getReputationProvider(): ReputationProvider | null {
    return activeReputationProvider;
  },

  async analyzeWebsite(input: WebsiteAnalysisInput): Promise<WebsiteTrustAnalysis> {
    if (!input || !input.url) {
      return this._buildUnableToVerify('No URL provided for analysis.');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(input.url);
    } catch {
      return this._buildUnableToVerify(`Invalid URL structure: ${input.url}`);
    }

    const protocol = parsedUrl.protocol.toLowerCase();
    const hostname = parsedUrl.hostname.toLowerCase();
    const fullUrl = parsedUrl.href;

    // Reject internal browser schemes or unsupported schemes
    if (['chrome:', 'edge:', 'about:', 'chrome-extension:'].includes(protocol)) {
      return this._buildUnableToVerify(`Internal browser or extension page (${protocol}) cannot be evaluated for web fraud.`);
    }

    const findings: TrustFinding[] = [];
    const reasons: string[] = [];

    // --- Signal 1: Connection Security (HTTPS vs HTTP) ---
    const isHttps = protocol === 'https:';
    if (!isHttps) {
      findings.push({
        id: 'conn-http',
        severity: 'medium',
        title: 'Unencrypted Connection (HTTP)',
        description: 'This webpage uses unencrypted HTTP. Any personal or sensitive data entered will be transmitted in plaintext across the network.'
      });
      reasons.push('Page is not served over HTTPS encryption.');
    }

    // --- Signal 2: IP-Address Hostname Check ---
    const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const isIpv6 = /^\[?[0-9a-fA-F:]+\]?$/.test(hostname);
    if (isIpv4 || isIpv6) {
      findings.push({
        id: 'host-ip',
        severity: 'high',
        title: 'Direct IP Address Hostname',
        description: `Website is accessed directly via IP address (${hostname}) instead of a registered domain name. Legitimate organizations virtually never request personal details via raw IP addresses.`
      });
      reasons.push('Hostname is a numeric IP address rather than a verified domain name.');
    }

    // --- Signal 3: Internationalized / Punycode Domain ---
    const hasNonAscii = [...hostname].some(c => c.charCodeAt(0) > 127);
    if (hostname.includes('xn--') || hasNonAscii) {
      findings.push({
        id: 'host-punycode',
        severity: 'high',
        title: 'Internationalized / Punycode Domain Detected',
        description: 'The domain name contains Punycode (xn--) or non-ASCII characters. Punycode is often used in homograph attacks to impersonate legitimate domains with visually identical characters from other alphabets.'
      });
      reasons.push('Domain uses Punycode encoding, a common vector for homograph phishing.');
    }

    // --- Signal 4: Subdomain Depth ---
    const domainLabels = hostname.split('.').filter(Boolean);
    if (domainLabels.length >= 5) {
      findings.push({
        id: 'host-subdomain-depth',
        severity: 'medium',
        title: 'Excessive Subdomain Depth',
        description: `Domain contains an unusually deep subdomain chain (${domainLabels.length} levels). Phishing sites frequently use deep subdomains to mimic legitimate brand URLs while obscuring the true apex domain.`
      });
      reasons.push('Unusually deep subdomain hierarchy.');
    }

    // --- Signal 5: Brand Impersonation & Lookalike Detection ---
    const normalizedHost = normalizeLeet(hostname);
    const pageApex = getApexDomain(hostname);

    for (const [brand, officialDomains] of Object.entries(KNOWN_BRANDS)) {
      const isOfficial = officialDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
      if (isOfficial) continue; // Genuine official domain

      // Check if hostname or normalized leetspeak hostname contains the brand keyword
      const containsBrandDirect = hostname.includes(brand);
      const containsBrandLeet = normalizedHost.includes(brand) || normalizedHost.includes(normalizeLeet(brand));

      if (containsBrandDirect || containsBrandLeet) {
        findings.push({
          id: `brand-impersonation-${brand}`,
          severity: 'high',
          title: `Potential Brand Impersonation (${brand.toUpperCase()})`,
          description: `The domain name (${hostname}) references brand name "${brand}", but is not an authorized official domain of ${brand} (official: ${officialDomains.join(', ')}).`
        });
        reasons.push(`Domain name contains brand name "${brand}" on an unauthorized host.`);
        break;
      }
    }

    // --- Signal 6: Page Title Brand Mismatch ---
    if (input.pageTitle) {
      const titleLower = input.pageTitle.toLowerCase();
      for (const [brand, officialDomains] of Object.entries(KNOWN_BRANDS)) {
        const isOfficial = officialDomains.some(d => hostname === d || hostname.endsWith(`.${d}`));
        if (isOfficial) continue;

        // If title prominently claims to be this brand (e.g., "PayPal Login", "Sign In - Amazon")
        const titleRegex = new RegExp(`\\b${brand}\\b`, 'i');
        if (titleRegex.test(titleLower)) {
          // Double check if page domain doesn't match
          findings.push({
            id: `title-mismatch-${brand}`,
            severity: 'high',
            title: `Page Title Identity Mismatch (${brand.toUpperCase()})`,
            description: `The page title ("${input.pageTitle.slice(0, 50)}") claims identity of ${brand.toUpperCase()}, but the actual domain (${hostname}) does not belong to ${brand}.`
          });
          reasons.push(`Page title claims identity of ${brand}, but domain does not match.`);
          break;
        }
      }
    }

    // --- Signal 7: Suspicious URL Redirect Parameters ---
    const searchParams = parsedUrl.searchParams;
    const suspiciousParamKeys = ['redirect', 'redirect_url', 'return_to', 'next', 'target', 'dest', 'url'];
    for (const key of suspiciousParamKeys) {
      const val = searchParams.get(key);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        try {
          const redirectHost = new URL(val).hostname.toLowerCase();
          if (redirectHost !== hostname) {
            findings.push({
              id: 'param-open-redirect',
              severity: 'medium',
              title: 'External Open Redirect Parameter',
              description: `URL contains parameter "${key}" redirecting to external domain "${redirectHost}". Open redirects are frequently exploited to conceal malicious landing destinations.`
            });
            reasons.push(`URL contains parameter redirecting to external domain ${redirectHost}.`);
            break;
          }
        } catch {}
      }
    }

    // --- Signal 8: Form Submission Destination (Form Action) Analysis ---
    if (input.forms && input.forms.length > 0) {
      for (const form of input.forms) {
        if (!form.action) continue;
        const rawAction = form.action.trim();
        if (!rawAction) continue;

        // Check for javascript: or data: form action
        if (rawAction.toLowerCase().startsWith('javascript:') || rawAction.toLowerCase().startsWith('data:')) {
          findings.push({
            id: `form-script-action-${form.id}`,
            severity: 'high',
            title: 'Malicious Script / Data Form Destination',
            description: `Form "${form.name || form.id}" submits to a ${rawAction.slice(0, 15)} destination rather than a standard web endpoint.`
          });
          reasons.push('Form submits to a script or data URI.');
          continue;
        }

        let actionUrl: URL;
        try {
          actionUrl = new URL(rawAction, parsedUrl.href);
        } catch {
          continue;
        }

        const actionProtocol = actionUrl.protocol.toLowerCase();
        const actionHost = actionUrl.hostname.toLowerCase();

        // Mixed Content: HTTPS page submitting form over HTTP
        if (isHttps && actionProtocol === 'http:') {
          findings.push({
            id: `form-mixed-content-${form.id}`,
            severity: 'high',
            title: 'Insecure Form Submission (Mixed Content)',
            description: `An encrypted HTTPS page submits form "${form.name || form.id}" to an unencrypted HTTP destination (${actionUrl.href.slice(0, 60)}). Data will be sent in plaintext.`
          });
          reasons.push('Form data is submitted over unencrypted HTTP from an HTTPS page.');
        }

        // External Destination Mismatch
        const actionApex = getApexDomain(actionHost);
        if (actionApex !== pageApex) {
          findings.push({
            id: `form-external-action-${form.id}`,
            severity: 'medium',
            title: 'Form Submits to External Third-Party Domain',
            description: `Form "${form.name || form.id}" submits data to an external domain (${actionHost}) differing from the current website (${hostname}).`
          });
          reasons.push(`Form destination (${actionHost}) does not match website domain (${hostname}).`);
        }
      }
    }

    // --- Signal 9: Optional External Reputation Provider ---
    let externalChecked = false;
    let providerName: string | undefined;

    if (activeReputationProvider) {
      try {
        const isConfigured = await activeReputationProvider.isConfigured();
        if (isConfigured) {
          const repResult = await activeReputationProvider.checkDomain(hostname);
          externalChecked = true;
          providerName = activeReputationProvider.name;
          if (repResult && repResult.findings.length > 0) {
            findings.push(...repResult.findings);
            reasons.push(`Reputation service flagged domain: ${repResult.status}`);
          }
        }
      } catch (err: any) {
        // Reputation provider error handled gracefully
        findings.push({
          id: 'rep-provider-error',
          severity: 'low',
          title: 'Reputation Check Incomplete',
          description: `External reputation check could not be completed (${err.message || 'network error'}). Falling back to local heuristic checks.`
        });
      }
    }

    // --- Status Determination ---
    const hasHighSeverity = findings.some(f => f.severity === 'high');
    const hasMediumSeverity = findings.some(f => f.severity === 'medium');

    let status: TrustRiskStatus = 'NO_OBVIOUS_WARNINGS';
    if (hasHighSeverity) {
      status = 'HIGH_RISK';
    } else if (hasMediumSeverity) {
      status = 'CAUTION';
    }

    // Recommendation wording
    let recommendation: string;
    if (status === 'HIGH_RISK') {
      recommendation = 'Strong fraud or brand impersonation indicators were detected. Do NOT autofill or submit personal, authentication, or financial details. Carefully check the official website domain.';
    } else if (status === 'CAUTION') {
      recommendation = 'Review the form destination and website URL carefully before proceeding. Confirm that this specific domain is the legitimate party you intend to share data with.';
    } else {
      recommendation = 'Preliminary local heuristics found no obvious red flags. Always verify the domain name in your browser address bar before submitting personal information.';
    }

    const disclaimer = isHttps
      ? 'HTTPS is active. Connection is encrypted in transit, but HTTPS does not prove the website or its operator is legitimate.'
      : 'Connection is unencrypted. Anyone monitoring network traffic can intercept submitted data.';

    return {
      status,
      statusLabel: TRUST_STATUS_LABELS[status],
      domain: hostname,
      fullUrl,
      protocol,
      isHttps,
      confidence: externalChecked ? 'moderate' : 'preliminary',
      findings,
      reasons: reasons.length > 0 ? reasons : ['No suspicious domain, lookalike, or form destination patterns detected by local heuristics.'],
      recommendation,
      externalReputationChecked: externalChecked,
      reputationProviderName: providerName,
      assessmentType: externalChecked ? 'hybrid' : 'local_heuristics',
      disclaimer
    };
  },

  _buildUnableToVerify(reason: string): WebsiteTrustAnalysis {
    return {
      status: 'UNABLE_TO_VERIFY',
      statusLabel: TRUST_STATUS_LABELS['UNABLE_TO_VERIFY'],
      domain: 'unknown',
      fullUrl: '',
      protocol: '',
      isHttps: false,
      confidence: 'preliminary',
      findings: [
        {
          id: 'unverified-context',
          severity: 'low',
          title: 'Insufficient Information',
          description: reason
        }
      ],
      reasons: [reason],
      recommendation: 'Unable to evaluate website trust. Inspect the website URL and verify authenticity manually before autofilling any personal information.',
      externalReputationChecked: false,
      assessmentType: 'local_heuristics',
      disclaimer: 'FormPilot could not determine domain parameters for this context.'
    };
  }
};
