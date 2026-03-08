import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, FileEdit, Plus, ChevronRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import BuildingPermitRequestDialog from '@/components/cadastral/BuildingPermitRequestDialog';

interface PermitRequestCardProps {
  parcelNumber?: string;
}

export function PermitRequestCard({ parcelNumber }: PermitRequestCardProps) {
  const navigate = useNavigate();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<'new' | 'regularization'>('new');

  const handleNewPermitRequest = (type: 'new' | 'regularization') => {
    setSelectedRequestType(type);
    setShowRequestDialog(true);
  };

  return (
    <>
      <Card className="max-w-[360px] mx-auto rounded-2xl shadow-lg border-border/50 overflow-hidden bg-gradient-to-br from-background to-muted/20">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Nouvelle demande</h3>
                <p className="text-[10px] text-muted-foreground">Obtenez votre permis</p>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-xs rounded-xl" align="end">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Types de permis</h4>
                  <div className="space-y-1.5">
                    <p><strong>Construire :</strong> Pour un nouveau projet de construction sur terrain vide ou avec construction précaire.</p>
                    <p><strong>Régulariser :</strong> Pour une construction existante sans permis ou avec modifications non autorisées.</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {/* Option: Permis de construire */}
            <button
              type="button"
              onClick={() => handleNewPermitRequest('new')}
              className="w-full group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-foreground">Autorisation de bâtir</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Nouvelle construction ou projet futur
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Option: Permis de régularisation */}
            <button
              type="button"
              onClick={() => handleNewPermitRequest('regularization')}
              className="w-full group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileEdit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-foreground">Permis de régularisation</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Construction existante à régulariser
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Footer info */}
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground text-center leading-tight">
              💡 Pour démarrer une demande, vous devez d'abord effectuer une contribution cadastrale (CCC)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de demande de permis */}
      <BuildingPermitRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        parcelNumber={parcelNumber || ''}
        hasExistingConstruction={selectedRequestType === 'regularization'}
      />
    </>
  );
}
