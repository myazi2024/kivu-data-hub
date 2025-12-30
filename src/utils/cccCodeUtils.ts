// Utility functions for CCC codes status management

export type CCCCodeStatus = 'valid' | 'used' | 'expired' | 'invalidated';

export interface CCCCodeStatusInfo {
  status: CCCCodeStatus;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const getCodeStatus = (code: {
  is_valid?: boolean | null;
  is_used: boolean;
  expires_at: string;
  is_active?: boolean;
}): CCCCodeStatus => {
  const now = new Date();
  const isExpired = new Date(code.expires_at) <= now;
  
  if (code.is_valid === false) return 'invalidated';
  if (code.is_active === false) return 'invalidated';
  if (code.is_used) return 'used';
  if (isExpired) return 'expired';
  return 'valid';
};

export const getCodeStatusInfo = (code: {
  is_valid?: boolean | null;
  is_used: boolean;
  expires_at: string;
  is_active?: boolean;
}): CCCCodeStatusInfo => {
  const status = getCodeStatus(code);
  
  switch (status) {
    case 'valid':
      return { status, label: 'Actif', variant: 'default' };
    case 'used':
      return { status, label: 'Utilisé', variant: 'secondary' };
    case 'expired':
      return { status, label: 'Expiré', variant: 'destructive' };
    case 'invalidated':
      return { status, label: 'Inactif', variant: 'outline' };
    default:
      return { status: 'valid', label: 'Actif', variant: 'default' };
  }
};
