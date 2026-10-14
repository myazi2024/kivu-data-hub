import { ReactNode, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AnalyticsCatalog from './AnalyticsCatalog';

interface AnalyticsCatalogDialogProps {
  trigger?: ReactNode;
  /** Ouverture contrôlée (bouton flottant). Laisser vide pour l'usage déclenché par `trigger`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AnalyticsCatalogDialog({ trigger, open, onOpenChange }: AnalyticsCatalogDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const handleChange = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  return <Dialog open={isOpen} onOpenChange={handleChange}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-dvh sm:max-h-dvh sm:rounded-none sm:p-0 md:h-[90dvh] md:max-h-[90dvh] md:max-w-4xl md:rounded-2xl" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
      <DialogHeader className="shrink-0 border-b border-border p-3 pr-14 text-left sm:p-4 sm:pr-16">
        <DialogTitle className="flex items-center gap-2 text-base"><BarChart3 aria-hidden="true" className="h-5 w-5 text-primary" />Catalogue des données</DialogTitle>
        <DialogDescription className="text-xs">Données foncières · Accès par visuel</DialogDescription>
      </DialogHeader>
      <AnalyticsCatalog />
    </DialogContent>
  </Dialog>;
}
