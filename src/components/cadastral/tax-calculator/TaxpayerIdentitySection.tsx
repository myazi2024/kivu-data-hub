import React, { useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Info, ShieldCheck, ExternalLink } from 'lucide-react';

interface TaxpayerIdentitySectionProps {
  ownerName: string;
  setOwnerName: (v: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (f: File | null) => void;
  hasNif: boolean | null;
  setHasNif: (v: boolean | null) => void;
  nif: string;
  setNif: (v: string) => void;
  onOpenServiceCatalog?: () => void;
}

const TaxpayerIdentitySection: React.FC<TaxpayerIdentitySectionProps> = ({
  ownerName, setOwnerName, idDocumentFile, setIdDocumentFile,
  hasNif, setHasNif, nif, setNif, onOpenServiceCatalog
}) => {
  return (
    <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <Label className="text-base font-semibold">Identité du contribuable</Label>
            <p className="text-xs text-muted-foreground">Propriétaire de la parcelle</p>
          </div>
        </div>

        {/* Synced owner identity message */}
        <button
          type="button"
          onClick={() => onOpenServiceCatalog?.()}
          className="w-full text-left p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer group"
        >
          <div className="flex gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Identité synchronisée automatiquement
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Le nom et la pièce d'identité du propriétaire actuel sont issus de la base de données cadastrale.
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1.5 flex items-center gap-1 font-medium group-hover:underline">
                <ExternalLink className="h-3 w-3" />
                Cliquez ici pour consulter l'identité du propriétaire
              </p>
            </div>
          </div>
        </button>

        {/* NIF toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Avez-vous un Numéro d'Impôt (NIF) ? *</Label>
          <RadioGroup
            value={hasNif === null ? '' : hasNif ? 'yes' : 'no'}
            onValueChange={(v) => setHasNif(v === 'yes')}
            className="flex gap-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" id="nif-yes" />
              <label htmlFor="nif-yes" className="text-sm cursor-pointer">Oui, j'ai un NIF</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" id="nif-no" />
              <label htmlFor="nif-no" className="text-sm cursor-pointer">Non</label>
            </div>
          </RadioGroup>
        </div>

        {/* NIF input if yes */}
        {hasNif === true && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Numéro d'Impôt (NIF) *</Label>
            <Input
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="Ex: A0123456B"
              className="h-10 text-sm rounded-xl"
            />
          </div>
        )}

        {/* Reassuring message if no NIF */}
        {hasNif === false && (
          <div className="flex gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Pas de NIF ? Aucun souci !</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Un NIF vous sera attribué lors de la soumission de votre déclaration fiscale auprès de la DGI.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxpayerIdentitySection;
