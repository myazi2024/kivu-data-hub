import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';

interface MortgageStatsCardsProps {
  activeCount: number;
  paidCount: number;
  pendingCount: number;
  totalAmount: number;
  onTabChange: (tab: string) => void;
}

/** Fix #10: Use formatCurrency instead of manual $Xk formatting */
const MortgageStatsCards: React.FC<MortgageStatsCardsProps> = ({
  activeCount, paidCount, pendingCount, totalAmount, onTabChange
}) => (
  <div className="grid grid-cols-4 gap-2">
    <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => onTabChange('approved')}>
      <p className="text-lg md:text-xl font-bold text-blue-500">{activeCount}</p>
      <p className="text-[9px] md:text-[10px] text-muted-foreground">Actives</p>
    </Card>
    <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => onTabChange('approved')}>
      <p className="text-lg md:text-xl font-bold text-green-500">{paidCount}</p>
      <p className="text-[9px] md:text-[10px] text-muted-foreground">Soldées</p>
    </Card>
    <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center cursor-pointer hover:bg-accent/50" onClick={() => onTabChange('requests')}>
      <p className="text-lg md:text-xl font-bold text-yellow-500">{pendingCount}</p>
      <p className="text-[9px] md:text-[10px] text-muted-foreground">En attente</p>
    </Card>
    <Card className="p-2.5 md:p-3 bg-background rounded-xl shadow-sm border text-center">
      <p className="text-sm md:text-base font-bold text-primary truncate">{formatCurrency(totalAmount)}</p>
      <p className="text-[9px] md:text-[10px] text-muted-foreground">Total actif</p>
    </Card>
  </div>
);

export default MortgageStatsCards;
