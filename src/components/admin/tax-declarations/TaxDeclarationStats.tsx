import { Card } from '@/components/ui/card';

interface Props {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  returned: number;
}

export const TaxDeclarationStats = ({ total, pending, approved, rejected, returned }: Props) => {
  const items = [
    { label: 'Total', value: total, color: 'text-foreground' },
    { label: 'En attente', value: pending, color: 'text-amber-600' },
    { label: 'Approuvées', value: approved, color: 'text-emerald-600' },
    { label: 'Rejetées', value: rejected, color: 'text-destructive' },
    { label: 'Renvoyées', value: returned, color: 'text-orange-600' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {items.map(s => (
        <Card key={s.label} className="p-3">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
        </Card>
      ))}
    </div>
  );
};
