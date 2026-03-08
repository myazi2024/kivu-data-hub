import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusVariant, getStatusLabel } from '@/utils/disputeSharedTypes';

interface DisputeStatusBadgeProps {
  status: string;
  className?: string;
}

const DisputeStatusBadge: React.FC<DisputeStatusBadgeProps> = ({ status, className = 'text-[10px]' }) => {
  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
};

export default DisputeStatusBadge;
