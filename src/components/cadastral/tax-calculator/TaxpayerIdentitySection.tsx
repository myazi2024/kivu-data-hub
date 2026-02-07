import React, { useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Upload, CheckCircle, Info } from 'lucide-react';

interface TaxpayerIdentitySectionProps {
  ownerName: string;
  setOwnerName: (v: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (f: File | null) => void;
  hasNif: boolean | null;
  setHasNif: (v: boolean | null) => void;
  nif: string;
  setNif: (v: string) => void;
}

const TaxpayerIdentitySection: React.FC<TaxpayerIdentitySectionProps> = ({
  ownerName, setOwnerName, idDocumentFile, setIdDocumentFile,
  hasNif, setHasNif, nif, setNif
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) {
      return; // max 5MB
    }
    setIdDocumentFile(file);
  };

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

        {/* Owner name */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Nom complet du propriétaire *</Label>
          <Input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Ex: Jean-Pierre Mukendi"
            className="h-10 text-sm rounded-xl"
          />
        </div>

        {/* ID document upload */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Pièce d'identité</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {idDocumentFile ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm truncate flex-1">{idDocumentFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIdDocumentFile(null)}
                className="h-7 text-xs"
              >
                Retirer
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-10 rounded-xl text-sm gap-2 border-dashed"
            >
              <Upload className="h-4 w-4" />
              Joindre une pièce d'identité
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Carte d'identité, passeport ou carte d'électeur (max 5 Mo)</p>
        </div>

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
                Un Numéro d'Impôt (NIF) vous sera automatiquement attribué lors de la soumission de votre fiche de déclaration fiscale et du paiement de l'impôt dû auprès de la DGI.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaxpayerIdentitySection;
