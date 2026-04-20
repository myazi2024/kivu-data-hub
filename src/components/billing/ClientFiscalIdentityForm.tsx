import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Building2, User, AlertCircle } from 'lucide-react';
import { validateNIF } from '@/components/cadastral/tax-calculator/taxFormConstants';

export type ClientType = 'individual' | 'company';

export interface ClientFiscalIdentity {
  client_type: ClientType;
  client_name: string;
  client_nif: string;
  client_rccm: string;
  client_id_nat: string;
  client_address: string;
  client_tax_regime: string;
}

export const EMPTY_FISCAL_IDENTITY: ClientFiscalIdentity = {
  client_type: 'individual',
  client_name: '',
  client_nif: '',
  client_rccm: '',
  client_id_nat: '',
  client_address: '',
  client_tax_regime: '',
};

interface Props {
  value: ClientFiscalIdentity;
  onChange: (next: ClientFiscalIdentity) => void;
  /** Quand true, NIF/RCCM deviennent obligatoires pour un client entreprise */
  required?: boolean;
}

/**
 * Capture l'identité fiscale du client conformément à la facture normalisée DGI (RDC).
 * - Particulier : nom, ID national, adresse
 * - Entreprise : raison sociale, NIF, RCCM, adresse, régime fiscal
 */
export const ClientFiscalIdentityForm: React.FC<Props> = ({ value, onChange, required = true }) => {
  const update = (patch: Partial<ClientFiscalIdentity>) => onChange({ ...value, ...patch });

  const isCompany = value.client_type === 'company';
  const nifInvalid = isCompany && value.client_nif.trim() !== '' && !validateNIF(value.client_nif);

  return (
    <Card className="p-4 space-y-4 border-primary/20 bg-primary/5">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Identification fiscale (DGI)</strong> — Ces informations
          apparaîtront sur la facture normalisée. Les entreprises doivent renseigner leur NIF et leur RCCM.
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Type de client</Label>
        <RadioGroup
          value={value.client_type}
          onValueChange={(v) => update({ client_type: v as ClientType })}
          className="grid grid-cols-2 gap-2"
        >
          <Label
            htmlFor="client-individual"
            className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition ${
              value.client_type === 'individual' ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <RadioGroupItem value="individual" id="client-individual" />
            <User className="h-4 w-4" />
            <span className="text-sm">Particulier</span>
          </Label>
          <Label
            htmlFor="client-company"
            className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition ${
              value.client_type === 'company' ? 'border-primary bg-primary/10' : 'border-border'
            }`}
          >
            <RadioGroupItem value="company" id="client-company" />
            <Building2 className="h-4 w-4" />
            <span className="text-sm">Entreprise</span>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_name" className="text-sm">
          {isCompany ? 'Raison sociale' : 'Nom complet'} {required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id="client_name"
          value={value.client_name}
          onChange={(e) => update({ client_name: e.target.value })}
          placeholder={isCompany ? 'Ex: Société ABC SARL' : 'Ex: Jean Dupont'}
        />
      </div>

      {isCompany ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client_nif" className="text-sm">
                NIF {required && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="client_nif"
                value={value.client_nif}
                onChange={(e) => update({ client_nif: e.target.value })}
                placeholder="Ex: A0123456B"
                className={nifInvalid ? 'border-destructive' : ''}
              />
              {nifInvalid && (
                <p className="text-xs text-destructive">Format NIF invalide (6-15 caractères alphanumériques)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_rccm" className="text-sm">
                RCCM {required && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="client_rccm"
                value={value.client_rccm}
                onChange={(e) => update({ client_rccm: e.target.value })}
                placeholder="Ex: CD/KIN/RCCM/24-B-12345"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_tax_regime" className="text-sm">Régime fiscal</Label>
            <select
              id="client_tax_regime"
              value={value.client_tax_regime}
              onChange={(e) => update({ client_tax_regime: e.target.value })}
              className="flex h-11 w-full rounded-md border border-input bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">— Sélectionner —</option>
              <option value="reel">Régime du réel</option>
              <option value="forfaitaire">Régime forfaitaire</option>
              <option value="exonere">Exonéré</option>
            </select>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="client_id_nat" className="text-sm">
            N° pièce d'identité (CNI / Passeport)
          </Label>
          <Input
            id="client_id_nat"
            value={value.client_id_nat}
            onChange={(e) => update({ client_id_nat: e.target.value })}
            placeholder="N° d'identification national"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="client_address" className="text-sm">
          Adresse complète {required && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          id="client_address"
          value={value.client_address}
          onChange={(e) => update({ client_address: e.target.value })}
          placeholder="N°, avenue, quartier, commune, ville, province"
          rows={2}
        />
      </div>
    </Card>
  );
};

/**
 * Validation utilitaire — retourne null si valide, sinon message d'erreur.
 */
export function validateFiscalIdentity(value: ClientFiscalIdentity): string | null {
  if (!value.client_name.trim()) return 'Veuillez renseigner le nom du client';
  if (!value.client_address.trim()) return 'Veuillez renseigner l\'adresse complète';
  if (value.client_type === 'company') {
    if (!value.client_nif.trim()) return 'NIF obligatoire pour les entreprises (DGI)';
    if (!validateNIF(value.client_nif)) return 'Format NIF invalide';
    if (!value.client_rccm.trim()) return 'RCCM obligatoire pour les entreprises (DGI)';
  }
  return null;
}
