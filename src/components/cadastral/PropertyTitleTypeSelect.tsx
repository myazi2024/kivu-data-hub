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
    value: "Titre foncier",
    label: "Titre foncier (ancien système)",
    description: "Ancien titre de propriété délivré avant la réforme foncière",
    details: "Le titre foncier est l'ancien document de propriété délivré sous le régime colonial et dans les premières décennies de l'indépendance. Il atteste de la propriété définitive et incommutable d'un terrain. Bien que l'ancien système, ces titres restent valables et peuvent être convertis.",
    reference: "Ex: TF-123456 ou TF/NK/2024/001"
  },
  {
    value: "Concession perpétuelle",
    label: "Concession perpétuelle",
    description: "Droit d'usage perpétuel accordé par l'État sur un terrain du domaine privé",
    details: "La concession perpétuelle confère à son titulaire un droit d'usage, de jouissance et de disposition perpétuel sur un terrain appartenant au domaine privé de l'État. Ce droit est transmissible par succession ou aliénation et constitue l'un des droits fonciers les plus sûrs en RDC.",
    reference: "Ex: CP-123456 ou CP/2024/001"
  },
  {
    value: "Concession ordinaire",
    label: "Concession ordinaire",
    description: "Droit d'usage temporaire accordé par l'État pour une durée déterminée",
    details: "La concession ordinaire est un droit d'usage temporaire accordé par l'État pour une durée généralement de 25 ans renouvelable. Elle peut être transformée en concession perpétuelle après accomplissement des obligations de mise en valeur définies dans le contrat de concession.",
    reference: "Ex: CO-123456 ou CO/2024/001",
    isRenewable: true
  },
  {
    value: "Bail emphytéotique",
    label: "Bail emphytéotique",
    description: "Bail de longue durée (18 à 99 ans) conférant des droits étendus",
    details: "Le bail emphytéotique est un contrat de location de longue durée (minimum 18 ans, maximum 99 ans) qui confère à l'emphytéote des droits très étendus d'usage, de jouissance et de transformation du bien. L'emphytéote peut construire, planter et même hypothéquer ses droits.",
    reference: "Ex: BE-123456 ou BE/2024/001",
    isRenewable: true
  },
  {
    value: "Contrat de location (Concession provisoire)",
    label: "Contrat de location (Concession provisoire)",
    description: "Titre provisoire et précaire délivré par l'État pour une durée limitée",
    details: "Le contrat de location est un titre provisoire et précaire, souvent appelé \"concession provisoire\", délivré par l'État congolais pour une durée limitée (généralement 3 à 5 ans).",
    reference: "Ex: CL-123456 ou CL/2024/001",
    isRenewable: true
  },
  {
    value: "Autorisation d'occupation provisoire",
    label: "Autorisation d'occupation provisoire",
    description: "Droit précaire d'occupation d'un terrain en attente de régularisation",
    details: "L'autorisation d'occupation provisoire (AOP) est un droit précaire accordé temporairement en attendant la régularisation définitive du statut foncier. Elle n'est pas transmissible et peut être révoquée. Le titulaire doit entreprendre les démarches de régularisation dans les délais impartis.",
    reference: "Ex: AOP-123456 ou AOP/2024/001"
  },
  {
    value: "Permis d'occupation urbain",
    label: "Permis d'occupation urbain",
    description: "Autorisation d'occuper un terrain en zone urbaine",
    details: "Le permis d'occupation urbain est délivré par les autorités communales pour l'occupation d'une parcelle en zone urbaine. Il précède généralement l'obtention d'un titre foncier définitif et impose au titulaire de respecter les règles d'urbanisme et de mise en valeur.",
    reference: "Ex: POU-123456 ou POU/2024/001"
  },
  {
    value: "Permis d'occupation rural",
    label: "Permis d'occupation rural",
    description: "Autorisation d'occuper un terrain en zone rurale",
    details: "Le permis d'occupation rural permet l'occupation et l'exploitation agricole d'une terre en zone rurale. Il est délivré conformément aux règles coutumières locales et aux dispositions légales régissant les terres rurales. Il peut évoluer vers un titre plus stable.",
    reference: "Ex: POR-123456 ou POR/2024/001"
  }
];

interface PropertyTitleTypeSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  leaseType?: 'initial' | 'renewal';
  onLeaseTypeChange?: (type: 'initial' | 'renewal') => void;
  leaseYears?: number;
  onLeaseYearsChange?: (years: number) => void;
  disabled?: boolean;
}

const PropertyTitleTypeSelect: React.FC<PropertyTitleTypeSelectProps> = ({ 
  value, 
  onValueChange, 
  leaseType, 
  onLeaseTypeChange,
  leaseYears,
  onLeaseYearsChange,
  disabled = false
}) => {
  const [openPopoverId, setOpenPopoverId] = React.useState<string | null>(null);
  
  const selectedType = PROPERTY_TITLE_TYPES.find(t => t.value === value);
  const showLeaseTypeOption = selectedType?.isRenewable;

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
        
        {value && (
          <p className="text-xs text-muted-foreground">
            {selectedType?.description}
          </p>
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

export { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES };
export type { PropertyTitleType };
