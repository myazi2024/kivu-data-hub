import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Landmark } from 'lucide-react';
import { CadastralParcel } from '@/types/cadastral';

interface DocumentHeaderProps {
  parcel: CadastralParcel;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({ parcel }) => {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="relative overflow-hidden border-b-2 border-primary/30">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

      <div className="px-6 sm:px-10 py-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 print:bg-transparent">
        {/* Watermark */}
        <div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none print:hidden">
          <Landmark className="h-32 w-32 text-primary" />
        </div>

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 print:bg-primary/5">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em]">République Démocratique du Congo</p>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">Bureau d'Informations Cadastrales</p>
              </div>
            </div>

            <div className="mt-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Fiche Cadastrale
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Parcelle N° <span className="font-mono font-bold text-foreground">{parcel.parcel_number}</span>
              </p>
            </div>
          </div>

          <div className="text-right space-y-2 shrink-0">
            <div className="text-xs text-muted-foreground">
              <p>Générée le</p>
              <p className="font-semibold text-foreground">{today}</p>
            </div>
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              <Badge variant={parcel.parcel_type === 'SU' ? 'default' : 'secondary'} className="text-xs">
                {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
              </Badge>
              {/* The dispute badge is intentionally NOT shown here: dispute existence
                  is part of the paid `land_disputes` service. Surfacing it before
                  payment would leak a sensitive, billable signal. */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentHeader;
