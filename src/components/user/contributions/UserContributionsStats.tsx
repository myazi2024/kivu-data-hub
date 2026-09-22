interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export function UserContributionsStats({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Total', value: stats.total, color: 'text-foreground' },
    { label: 'Attente', value: stats.pending, color: 'text-amber-600' },
    { label: 'Validées', value: stats.approved, color: 'text-green-600' },
    { label: 'Rejetées', value: stats.rejected, color: 'text-destructive' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-md border bg-card p-3 text-center">
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
