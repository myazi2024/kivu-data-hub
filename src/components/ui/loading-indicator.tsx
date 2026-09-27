import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LoadingIndicator({ className, label = 'Chargement en cours' }: { className?: string; label?: string }) {
  return <span role="status" aria-label={label} className="inline-flex shrink-0 items-center justify-center"><Loader2 aria-hidden="true" className={cn('h-8 w-8 animate-spin text-primary', className)} /></span>;
}