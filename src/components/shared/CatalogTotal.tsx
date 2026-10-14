import { ReactNode } from 'react';

export default function CatalogTotal({ label, amount, detail }: { label: string; amount: string; detail?: ReactNode }) {
  return <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-xl border border-primary/20 gap-2">
    <span className="text-sm font-semibold">{label}</span>
    <div className="min-w-0 text-right"><div className="text-lg font-bold text-primary break-words">{amount}</div>{detail}</div>
  </div>;
}