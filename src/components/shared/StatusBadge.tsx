import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Ban, Gift, RefreshCw, CreditCard } from 'lucide-react';

export type StatusType = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'valid' 
  | 'used' 
  | 'expired' 
  | 'invalidated'
  | 'completed'
  | 'paid'
  | 'cancelled'
  | 'failed'
  | 'processing';

interface StatusBadgeProps {
  status: StatusType;
  compact?: boolean;
  className?: string;
}

export const StatusBadge = ({ status, compact = false, className = '' }: StatusBadgeProps) => {
  const statusConfig: Record<StatusType, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string; shortLabel: string; color: string }> = {
    pending: { 
      variant: 'outline', 
      icon: Clock, 
      label: 'En attente',
      shortLabel: 'Att.',
      color: 'text-orange-600'
    },
    approved: { 
      variant: 'default', 
      icon: CheckCircle, 
      label: 'Approuvé',
      shortLabel: 'App.',
      color: 'text-green-600'
    },
    rejected: { 
      variant: 'destructive', 
      icon: XCircle, 
      label: 'Rejeté',
      shortLabel: 'Rej.',
      color: 'text-red-600'
    },
    valid: {
      variant: 'default',
      icon: Gift,
      label: 'Valide',
      shortLabel: 'Val.',
      color: ''
    },
    used: {
      variant: 'secondary',
      icon: CheckCircle,
      label: 'Utilisé',
      shortLabel: 'Util.',
      color: ''
    },
    expired: {
      variant: 'outline',
      icon: XCircle,
      label: 'Expiré',
      shortLabel: 'Exp.',
      color: ''
    },
    invalidated: {
      variant: 'destructive',
      icon: Ban,
      label: 'Invalidé',
      shortLabel: 'Inv.',
      color: ''
    },
    completed: {
      variant: 'default',
      icon: CheckCircle,
      label: 'Complété',
      shortLabel: 'Comp.',
      color: 'text-green-600'
    },
    paid: {
      variant: 'default',
      icon: CreditCard,
      label: 'Payé',
      shortLabel: 'Payé',
      color: 'text-green-600'
    },
    cancelled: {
      variant: 'outline',
      icon: XCircle,
      label: 'Annulé',
      shortLabel: 'Ann.',
      color: 'text-gray-600'
    },
    failed: {
      variant: 'destructive',
      icon: AlertCircle,
      label: 'Échoué',
      shortLabel: 'Éch.',
      color: 'text-red-600'
    },
    processing: {
      variant: 'secondary',
      icon: RefreshCw,
      label: 'Traitement',
      shortLabel: 'Trait.',
      color: 'text-blue-600'
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
