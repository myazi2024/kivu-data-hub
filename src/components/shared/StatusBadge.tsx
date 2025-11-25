import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Ban, Gift } from 'lucide-react';

export type StatusType = 'pending' | 'approved' | 'rejected' | 'valid' | 'used' | 'expired' | 'invalidated';

interface StatusBadgeProps {
  status: StatusType;
  compact?: boolean;
  className?: string;
}

export const StatusBadge = ({ status, compact = false, className = '' }: StatusBadgeProps) => {
  const statusConfig = {
    pending: { 
      variant: 'outline' as const, 
      icon: Clock, 
      label: 'En attente',
      shortLabel: 'Att.',
      color: 'text-orange-600'
    },
    approved: { 
      variant: 'default' as const, 
      icon: CheckCircle, 
      label: 'Approuvé',
      shortLabel: 'App.',
      color: 'text-green-600'
    },
    rejected: { 
      variant: 'destructive' as const, 
      icon: XCircle, 
      label: 'Rejeté',
      shortLabel: 'Rej.',
      color: 'text-red-600'
    },
    valid: {
      variant: 'default' as const,
      icon: Gift,
      label: 'Valide',
      shortLabel: 'Val.',
      color: ''
    },
    used: {
      variant: 'secondary' as const,
      icon: CheckCircle,
      label: 'Utilisé',
      shortLabel: 'Util.',
      color: ''
    },
    expired: {
      variant: 'outline' as const,
      icon: XCircle,
      label: 'Expiré',
      shortLabel: 'Exp.',
      color: ''
    },
    invalidated: {
      variant: 'destructive' as const,
      icon: Ban,
      label: 'Invalidé',
      shortLabel: 'Inv.',
      color: ''
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-0.5 text-[10px] sm:text-xs px-1.5 py-0 ${className}`}>
      <Icon className="h-2 w-2 sm:h-3 sm:w-3" />
      <span className={compact ? 'hidden sm:inline' : ''}>
        {compact ? config.shortLabel : config.label}
      </span>
      {compact && <span className="sm:hidden">{config.shortLabel}</span>}
    </Badge>
  );
};
