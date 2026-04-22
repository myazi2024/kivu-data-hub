import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info, User } from 'lucide-react';
import { RequesterInfo } from './types';
import { useCCCFormPicklists } from '@/hooks/useCCCFormPicklists';
import SuggestivePicklist from '@/components/cadastral/SuggestivePicklist';

interface RequesterIdentityBlockProps {
  requester: RequesterInfo;
  onChange: (r: RequesterInfo) => void;
}

/**
 * Bloc d'identité du demandeur — aligné sur le bloc « Propriétaire actuel »
 * du formulaire CCC (GeneralTab → CurrentOwnersSection), sans les concepts
 * propres au titre foncier (date d'acquisition, titre antérieur, copropriétaires).
 */
const RequesterIdentityBlock: React.FC<RequesterIdentityBlockProps> = ({ requester, onChange }) => {
  const { getOptions } = useCCCFormPicklists();

  const update = (patch: Partial<RequesterInfo>) => onChange({ ...requester, ...patch });

  const status = requester.legalStatus || '';

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Identité du demandeur</h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full ml-auto">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl text-xs" align="end">
              <p className="text-muted-foreground">
                Renseignez l'identité légale du demandeur. Les champs varient selon le statut juridique
                (personne physique, personne morale, ou État).
              </p>
            </PopoverContent>
          </Popover>
        </div>

        {/* Statut juridique */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">Statut juridique <span className="text-destructive">*</span></Label>
          <Select
            value={status}
            onValueChange={(value) => {
              update({
                legalStatus: value as RequesterInfo['legalStatus'],
                // reset dependent fields
                gender: '',
                entityType: '',
                entitySubType: '',
                entitySubTypeOther: '',
                rccmNumber: '',
                rightType: '',
                stateExploitedBy: '',
                ...(value !== 'Personne physique' ? { middleName: '' } : {}),
              });
            }}
          >
            <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent className="rounded-xl">
              {getOptions('picklist_legal_status').map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Genre — Personne physique */}
        {status === 'Personne physique' && (
          <div className="space-y-1 animate-fade-in">
            <Label className="text-sm font-medium">Genre <span className="text-destructive">*</span></Label>
            <Select value={requester.gender || ''} onValueChange={(value) => update({ gender: value })}>
              <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner le genre" /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {getOptions('picklist_gender').map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Champs selon statut */}
        {status === 'Personne morale' ? (
          <RequesterPersonneMoraleFields requester={requester} update={update} getOptions={getOptions} />
        ) : status === 'État' ? (
          <RequesterEtatFields requester={requester} update={update} getOptions={getOptions} />
        ) : status === 'Personne physique' ? (
          <div className="grid grid-cols-1 gap-2 animate-fade-in">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Nom <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nom de famille"
                value={requester.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Post-nom</Label>
                <Input
                  placeholder="Post-nom"
                  value={requester.middleName || ''}
                  onChange={(e) => update({ middleName: e.target.value })}
                  className="h-10 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Prénom <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Prénom"
                  value={requester.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                  className="h-10 text-sm rounded-xl"
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Nationalité */}
        {status && status !== 'État' && (
          <div className="space-y-1.5 animate-fade-in">
            <Label className="text-sm font-medium">Nationalité <span className="text-destructive">*</span></Label>
            <RadioGroup
              value={requester.nationality || ''}
              onValueChange={(value) => update({ nationality: value as RequesterInfo['nationality'] })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Congolais (RD)" id="req-nationality-congolais" />
                <Label htmlFor="req-nationality-congolais" className="text-sm cursor-pointer">Congolais (RD)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Étranger" id="req-nationality-etranger" />
                <Label htmlFor="req-nationality-etranger" className="text-sm cursor-pointer">Étranger</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Coordonnées de contact (spécifiques à la demande) */}
        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Téléphone <span className="text-destructive">*</span></Label>
            <Input
              type="tel"
              placeholder="+243 8XX XXX XXX"
              value={requester.phone}
              onChange={(e) => update({ phone: e.target.value })}
              className="h-10 text-sm rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              placeholder="(optionnel)"
              value={requester.email || ''}
              onChange={(e) => update({ email: e.target.value })}
              className="h-10 text-sm rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Qualité du demandeur <span className="text-destructive">*</span></Label>
            <Select
              value={requester.type}
              onValueChange={(v: any) => update({ type: v, isOwner: v === 'owner' })}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="owner">Propriétaire</SelectItem>
                <SelectItem value="mandatary">Mandataire</SelectItem>
                <SelectItem value="notary">Notaire</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Personne morale ────────────────────────────────── */
const RequesterPersonneMoraleFields: React.FC<{
  requester: RequesterInfo;
  update: (patch: Partial<RequesterInfo>) => void;
  getOptions: (key: string) => string[];
}> = ({ requester, update, getOptions }) => (
  <div className="space-y-2 animate-fade-in">
    <div className="space-y-1">
      <Label className="text-sm font-medium">Type d'entreprise <span className="text-destructive">*</span></Label>
      <Select
        value={requester.entityType || ''}
        onValueChange={(value) => update({ entityType: value, entitySubType: '', entitySubTypeOther: '' })}
      >
        <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          {getOptions('picklist_entity_type').map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {requester.entityType === 'Société' && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">Forme juridique <span className="text-destructive">*</span></Label>
        <Select
          value={requester.entitySubType || ''}
          onValueChange={(value) => update({ entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) })}
        >
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {getOptions('picklist_entity_subtype_societe').map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {requester.entitySubType === 'Autre' && (
          <Input
            placeholder="Précisez la forme juridique"
            value={requester.entitySubTypeOther || ''}
            onChange={(e) => update({ entitySubTypeOther: e.target.value })}
            className="h-10 text-sm rounded-xl mt-1"
          />
        )}
      </div>
    )}

    {requester.entityType === 'Association' && (
      <div className="space-y-1 animate-fade-in">
        <Label className="text-sm font-medium">Type d'association <span className="text-destructive">*</span></Label>
        <Select
          value={requester.entitySubType || ''}
          onValueChange={(value) => update({ entitySubType: value, ...(value !== 'Autre' ? { entitySubTypeOther: '' } : {}) })}
        >
          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            {getOptions('picklist_entity_subtype_association').map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {requester.entitySubType === 'Autre' && (
          <Input
            placeholder="Précisez le type d'association"
            value={requester.entitySubTypeOther || ''}
            onChange={(e) => update({ entitySubTypeOther: e.target.value })}
            className="h-10 text-sm rounded-xl mt-1"
          />
        )}
      </div>
    )}

    {requester.entityType && (
      <div className="space-y-2 animate-fade-in">
        <div className="space-y-1">
          <Label className="text-sm font-medium">
            {requester.entityType === 'Association' ? 'Dénomination' : 'Raison sociale'} <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder={requester.entityType === 'Association' ? "Dénomination de l'association" : "Dénomination officielle"}
            value={requester.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            className="h-10 text-sm rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">
            {requester.entityType === 'Association' ? "Numéro d'Arrêté ministériel d'autorisation" : "N° d'identification (RCCM)"} <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder={requester.entityType === 'Association' ? "Ex: 0XX/CAB/MIN/..." : "Ex: CD/KIN/RCCM/XX-X-XXXXX"}
            value={requester.rccmNumber || ''}
            onChange={(e) => update({ rccmNumber: e.target.value })}
            className="h-10 text-sm rounded-xl"
          />
        </div>
      </div>
    )}
  </div>
);

/* ─── État ────────────────────────────────── */
const RequesterEtatFields: React.FC<{
  requester: RequesterInfo;
  update: (patch: Partial<RequesterInfo>) => void;
  getOptions: (key: string) => string[];
}> = ({ requester, update, getOptions }) => (
  <div className="space-y-2 animate-fade-in">
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label className="text-sm font-medium">Type de droit <span className="text-destructive">*</span></Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0 rounded-full">
              <Info className="h-3 w-3 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 rounded-xl text-xs">
            <p className="text-muted-foreground">
              Nature du droit d'exploitation détenu par le service ou l'agence de l'État sur cette parcelle.
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <Select
        value={requester.rightType || ''}
        onValueChange={(value) => update({ rightType: value as RequesterInfo['rightType'] })}
      >
        <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
        <SelectContent className="rounded-xl">
          {getOptions('picklist_right_type').map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-sm font-medium">Exploitée par <span className="text-destructive">*</span></Label>
      <SuggestivePicklist
        picklistKey="state_agencies_drc"
        label=""
        placeholder="Rechercher un service ou agence de l'État..."
        maxSelection={1}
        selectedValues={requester.stateExploitedBy ? [requester.stateExploitedBy] : []}
        onSelectionChange={(values) => {
          const val = values[0] || '';
          update({ stateExploitedBy: val, lastName: val, firstName: 'État' });
        }}
      />
    </div>
  </div>
);

export default RequesterIdentityBlock;
