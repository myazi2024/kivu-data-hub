import React from 'react';
import { Info } from 'lucide-react';
import { MdDescription } from 'react-icons/md';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PropertyTitleType {
  value: string;
  label: string;
  description: string;
  details: string;
  reference: string;
  isRenewable?: boolean;
}

const PROPERTY_TITLE_TYPES: PropertyTitleType[] = [
  {
    value: "Certificat d'enregistrement",
    label: "Certificat d'enregistrement",
    description: "Document administratif prouvant l'enregistrement d'un droit foncier",
    details: "Le certificat d'enregistrement est délivré par le Conservateur des Titres Immobiliers après enregistrement d'un acte de mutation, de concession ou d'autre droit foncier. Il atteste que le droit a été régulièrement enregistré conformément aux dispositions légales en vigueur.",
    reference: "Ex: CE-123456 ou CE/NK/2024/001"
  },
  {
    value: "Contrat de location (Contrat d'occupation provisoire)",
    label: "Contrat de location (Contrat d'occupation provisoire)",
    description: "Titre provisoire et précaire délivré par l'État pour une durée limitée",
    details: "Le contrat de location est un titre provisoire et précaire, souvent appelé \"contrat d'occupation provisoire\", délivré par l'État congolais pour une durée limitée (généralement 3 à 5 ans).",
    reference: "Ex: CL-123456 ou CL/2024/001",
    isRenewable: true
  },
  {
    value: "Fiche parcellaire",
    label: "Fiche parcellaire",
    description: "Document administratif décrivant les caractéristiques d'une parcelle",
    details: "La fiche parcellaire est un document délivré par les services du cadastre qui décrit les caractéristiques principales d'une parcelle (localisation, superficie, propriétaire). Elle sert de référence administrative mais ne constitue pas un titre de propriété définitif.",
    reference: "Ex: FP-123456 ou FP/2024/001"
  },
  {
    value: "Autre",
    label: "Autre",
    description: "Autre type de titre de propriété non listé",
    details: "Si votre titre de propriété ne figure pas dans la liste ci-dessus, sélectionnez cette option et précisez le nom exact de votre titre dans le champ qui apparaîtra.",
    reference: "Ex: Numéro figurant sur votre document"
  },
];

interface PropertyTitleTypeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  leaseType?: 'initial' | 'renewal';
  onLeaseTypeChange?: (type: 'initial' | 'renewal') => void;
  leaseYears?: number;
  onLeaseYearsChange?: (years: number) => void;
  disabled?: boolean;
  customTitleName?: string;
  onCustomTitleNameChange?: (name: string) => void;
}

const PropertyTitleTypeSelect: React.FC<PropertyTitleTypeSelectProps> = ({ 
  value, 
  onValueChange, 
  leaseType, 
  onLeaseTypeChange,
  leaseYears,
  onLeaseYearsChange,
  disabled = false,
  customTitleName,
  onCustomTitleNameChange,
}) => {
  const [openPopoverId, setOpenPopoverId] = React.useState<string | null>(null);
  
  const selectedType = PROPERTY_TITLE_TYPES.find(t => t.value === value);
  const showLeaseTypeOption = selectedType?.isRenewable;
  const isAutre = value === 'Autre';

  return (
    <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
              <MdDescription className="h-3.5 w-3.5 text-primary" />
            </div>
            <Label className="text-sm font-semibold">Type de titre de propriété</Label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl" align="end">
              <div className="space-y-2 text-xs">
                <h4 className="font-semibold text-sm">Titres de propriété en RDC</h4>
                <p className="text-muted-foreground">
                  Titre officiel délivré par les services cadastraux (pas un acte de vente/donation).
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Select */}
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger className={`h-10 rounded-xl text-sm ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}>
            <SelectValue placeholder="Sélectionner le type de titre" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px] rounded-xl">
            {PROPERTY_TITLE_TYPES.map((type) => (
              <div key={type.value} className="flex items-center justify-between group">
                <SelectItem value={type.value} className="flex-1 pr-2">
                  <span className="font-medium text-sm">{type.label}</span>
                </SelectItem>
                <Popover 
                  open={openPopoverId === type.value} 
                  onOpenChange={(open) => setOpenPopoverId(open ? type.value : null)}
                >
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenPopoverId(openPopoverId === type.value ? null : type.value);
                      }}
                    >
                      <Info className="h-4 w-4 text-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[calc(100vw-2rem)] sm:w-96 max-w-md rounded-xl" 
                    side="left"
                    sideOffset={10}
                    align="start"
                  >
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">{type.label}</h4>
                        <p className="text-xs text-muted-foreground italic">{type.description}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs leading-relaxed">{type.details}</p>
                        <div className="p-2 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium mb-1">Format du numéro :</p>
                          <code className="text-xs text-primary">{type.reference}</code>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </SelectContent>
        </Select>
        
        {!isAutre && (
          <p className="text-xs text-muted-foreground">
            Sélectionnez dans la liste le document administratif ou le titre foncier attestant l'enregistrement d'un droit sur cette parcelle, qu'il soit établi au nom du propriétaire actuel ou non.
          </p>
        )}

        {/* Custom title name input for "Autre" */}
        {isAutre && onCustomTitleNameChange && (
          <div className="space-y-1 animate-fade-in">
            <Label className="text-sm font-medium">
              Nom du titre de propriété <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex: Livret de logeur, Attestation de propriété..."
              value={customTitleName || ''}
              onChange={(e) => onCustomTitleNameChange(e.target.value)}
              className="h-9 text-sm rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Précisez le nom exact du titre que vous détenez
            </p>
          </div>
        )}
        
        {showLeaseTypeOption && onLeaseTypeChange && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Type de bail</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 rounded-xl" side="top">
                  <div className="space-y-2 text-xs">
                    <h4 className="font-semibold text-sm">Où trouver cette info ?</h4>
                    <p className="text-muted-foreground">
                      Vérifiez sur votre document s'il s'agit du bail initial ou d'un renouvellement.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <RadioGroup
              value={leaseType || ''}
              onValueChange={(val) => onLeaseTypeChange(val as 'initial' | 'renewal')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="initial" id="lease-initial" />
                <Label htmlFor="lease-initial" className="text-sm cursor-pointer">Bail initial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="renewal" id="lease-renewal" />
                <Label htmlFor="lease-renewal" className="text-sm cursor-pointer">Renouvellement</Label>
              </div>
            </RadioGroup>

            {/* Lease years field */}
            {leaseType && onLeaseYearsChange && (
              <div className="space-y-1 animate-fade-in">
                <Label className="text-sm font-medium">
                  {leaseType === 'initial' ? "Nombre d'années accordé" : "Nombre d'années ajouté"}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  placeholder={leaseType === 'initial' ? "Ex: 25" : "Ex: 10"}
                  value={leaseYears || ''}
                  onChange={(e) => onLeaseYearsChange(parseInt(e.target.value) || 0)}
                  className="h-9 text-sm rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  {leaseType === 'initial' 
                    ? "Durée du bail accordée à l'origine" 
                    : "Durée supplémentaire ajoutée au renouvellement"}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/** Helper: get the effective display name for a title type (handles "Autre" with custom name) */
export const getEffectiveTitleName = (titleType: string | undefined, customTitleName?: string): string => {
  if (titleType === 'Autre' && customTitleName?.trim()) {
    return customTitleName.trim();
  }
  return titleType || '';
};

export { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES };
export type { PropertyTitleType };
