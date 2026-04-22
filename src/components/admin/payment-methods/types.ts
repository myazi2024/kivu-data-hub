export interface LocalMobileMoney {
  provider_id: string;
  provider_name: string;
  is_enabled: boolean;
  merchantCode: string;
  apiKey: string;
  secretKey: string;
  fee_percent: number;
  fee_fixed_usd: number;
}

export interface LocalBankCard {
  is_enabled: boolean;
  provider: 'stripe' | 'flutterwave' | 'paypal';
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  fee_percent: number;
  fee_fixed_usd: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  admin_name: string | null;
  old_values: unknown;
  new_values: unknown;
}

export interface TestResult {
  success: boolean;
  message: string;
}

const STRIPE_KEY_PATTERNS: Record<string, RegExp> = {
  publicKey: /^pk_(test|live)_/,
  secretKey: /^sk_(test|live)_/,
  webhookSecret: /^whsec_/,
};

export const validateCredentials = (
  provider: string,
  credentials: Record<string, string | undefined>,
  isEnabled: boolean
): string[] => {
  if (!isEnabled) return [];
  const errors: string[] = [];

  if (provider === 'stripe') {
    for (const [field, pattern] of Object.entries(STRIPE_KEY_PATTERNS)) {
      const val = credentials[field];
      if (val && !val.includes('••••') && !pattern.test(val)) {
        errors.push(`${field}: format Stripe invalide (attendu: ${pattern.source})`);
      }
    }
  }

  const hasAnyKey = Object.values(credentials).some((v) => v && v.length > 0 && !v.includes('••••'));
  const hasOriginalKeys = Object.values(credentials).some((v) => v?.includes('••••'));
  if (!hasAnyKey && !hasOriginalKeys) {
    errors.push('Au moins une clé API doit être renseignée');
  }

  return errors;
};

export const DEFAULT_MOBILE_MONEY: LocalMobileMoney[] = [
  { provider_id: 'airtel_money', provider_name: 'Airtel Money', is_enabled: true, apiKey: '', merchantCode: '', secretKey: '', fee_percent: 1.5, fee_fixed_usd: 0 },
  { provider_id: 'orange_money', provider_name: 'Orange Money', is_enabled: true, apiKey: '', merchantCode: '', secretKey: '', fee_percent: 1.5, fee_fixed_usd: 0 },
  { provider_id: 'mpesa', provider_name: 'M-Pesa', is_enabled: true, apiKey: '', merchantCode: '', secretKey: '', fee_percent: 1.5, fee_fixed_usd: 0 },
];

export const DEFAULT_BANK_CARD: LocalBankCard = {
  is_enabled: false,
  provider: 'stripe',
  publicKey: '',
  secretKey: '',
  webhookSecret: '',
  fee_percent: 2.9,
  fee_fixed_usd: 0.30,
};
