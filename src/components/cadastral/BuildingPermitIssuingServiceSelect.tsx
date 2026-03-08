import React from 'react';
import { Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface BuildingPermitIssuingService {
  value: string;
  label: string;
  level: string;
  description: string;
}

const ISSUING_SERVICES: BuildingPermitIssuingService[] = [
  // Services nationaux
  {
    value: "Ministère de l'Urbanisme et Habitat - Direction Générale de l'Urbanisme",
    label: "Ministère de l'Urbanisme et Habitat - DGU",
    level: "National",
    description: "Service national responsable de la délivrance des autorisations de bâtir pour les grands projets d'envergure nationale"
  },
  {
    value: "Agence Congolaise des Grands Travaux (ACGT)",
    label: "ACGT - Agence Congolaise des Grands Travaux",
    level: "National",
    description: "Agence nationale chargée des grands projets d'infrastructures"
  },
  
  // Services provinciaux - Kinshasa
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kinshasa",
    label: "DPUH Kinshasa",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la ville-province de Kinshasa"
  },
  
  // Services provinciaux - Nord-Kivu
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Nord-Kivu",
    label: "DPUH Nord-Kivu",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Nord-Kivu"
  },
  
  // Services provinciaux - Sud-Kivu
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Sud-Kivu",
    label: "DPUH Sud-Kivu",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Sud-Kivu"
  },
  
  // Services provinciaux - Haut-Katanga
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Haut-Katanga",
    label: "DPUH Haut-Katanga",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Haut-Katanga"
  },
  
  // Services provinciaux - Lualaba
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Lualaba",
    label: "DPUH Lualaba",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Lualaba"
  },
  
  // Services provinciaux - Kongo-Central
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kongo-Central",
    label: "DPUH Kongo-Central",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Kongo-Central"
  },
  
  // Services provinciaux - Autres provinces
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kwilu",
    label: "DPUH Kwilu",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Kwilu"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kwango",
    label: "DPUH Kwango",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Kwango"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Mai-Ndombe",
    label: "DPUH Mai-Ndombe",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province de Mai-Ndombe"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kasaï",
    label: "DPUH Kasaï",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Kasaï"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kasaï-Central",
    label: "DPUH Kasaï-Central",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Kasaï-Central"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Kasaï-Oriental",
    label: "DPUH Kasaï-Oriental",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Kasaï-Oriental"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Lomami",
    label: "DPUH Lomami",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Lomami"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Sankuru",
    label: "DPUH Sankuru",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Sankuru"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Maniema",
    label: "DPUH Maniema",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Maniema"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Tanganyika",
    label: "DPUH Tanganyika",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Tanganyika"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Haut-Lomami",
    label: "DPUH Haut-Lomami",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Haut-Lomami"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Ituri",
    label: "DPUH Ituri",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province de l'Ituri"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Tshopo",
    label: "DPUH Tshopo",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province de la Tshopo"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Bas-Uele",
    label: "DPUH Bas-Uele",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Bas-Uele"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Haut-Uele",
    label: "DPUH Haut-Uele",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Haut-Uele"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Équateur",
    label: "DPUH Équateur",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province de l'Équateur"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Mongala",
    label: "DPUH Mongala",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province de la Mongala"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Nord-Ubangi",
    label: "DPUH Nord-Ubangi",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Nord-Ubangi"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Sud-Ubangi",
    label: "DPUH Sud-Ubangi",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province du Sud-Ubangi"
  },
  {
    value: "Division Provinciale de l'Urbanisme et Habitat - Tshuapa",
    label: "DPUH Tshuapa",
    level: "Provincial",
    description: "Service provincial de l'urbanisme pour la province de la Tshuapa"
  },
  
  // Services communaux (exemples principaux)
  {
    value: "Service Communal d'Urbanisme - Gombe",
    label: "SCU Gombe (Kinshasa)",
    level: "Communal",
    description: "Service communal d'urbanisme de la commune de Gombe"
  },
  {
    value: "Service Communal d'Urbanisme - Limete",
    label: "SCU Limete (Kinshasa)",
    level: "Communal",
    description: "Service communal d'urbanisme de la commune de Limete"
  },
  {
    value: "Service Communal d'Urbanisme - Goma",
    label: "SCU Goma (Nord-Kivu)",
    level: "Communal",
    description: "Service communal d'urbanisme de la commune de Goma"
  },
  {
    value: "Service Communal d'Urbanisme - Karisimbi",
    label: "SCU Karisimbi (Nord-Kivu)",
    level: "Communal",
    description: "Service communal d'urbanisme de la commune de Karisimbi"
  },
  {
    value: "Service Communal d'Urbanisme - Ibanda",
    label: "SCU Ibanda (Sud-Kivu)",
    level: "Communal",
    description: "Service communal d'urbanisme de la commune d'Ibanda, Bukavu"
  },
  {
    value: "Service Communal d'Urbanisme - Lubumbashi",
    label: "SCU Lubumbashi (Haut-Katanga)",
    level: "Communal",
    description: "Service communal d'urbanisme de la commune de Lubumbashi"
  },
  {
    value: "Autre service d'urbanisme",
    label: "Autre service (à préciser)",
    level: "Autre",
    description: "Service d'urbanisme non listé ci-dessus"
  }
];

interface BuildingPermitIssuingServiceSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
}

const BuildingPermitIssuingServiceSelect: React.FC<BuildingPermitIssuingServiceSelectProps> = ({ 
  value, 
  onValueChange 
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Service émetteur du permis</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96" side="top">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Services émetteurs de permis de construire</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                En RDC, les permis de construire sont délivrés par différents niveaux de services selon l'ampleur du projet :
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• <strong>National</strong> : Ministère de l'Urbanisme et Habitat pour les grands projets</li>
                <li>• <strong>Provincial</strong> : Divisions Provinciales de l'Urbanisme et Habitat (DPUH)</li>
                <li>• <strong>Communal/Local</strong> : Services communaux d'urbanisme pour les projets locaux</li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le service émetteur" />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Services Nationaux</div>
          {ISSUING_SERVICES.filter(s => s.level === "National").map((service) => (
            <SelectItem key={service.value} value={service.value}>
              <div className="flex flex-col">
                <span className="font-medium">{service.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{service.description}</span>
              </div>
            </SelectItem>
          ))}
          
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Services Provinciaux</div>
          {ISSUING_SERVICES.filter(s => s.level === "Provincial").map((service) => (
            <SelectItem key={service.value} value={service.value}>
              <div className="flex flex-col">
                <span className="font-medium">{service.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{service.description}</span>
              </div>
            </SelectItem>
          ))}
          
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Services Communaux</div>
          {ISSUING_SERVICES.filter(s => s.level === "Communal").map((service) => (
            <SelectItem key={service.value} value={service.value}>
              <div className="flex flex-col">
                <span className="font-medium">{service.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{service.description}</span>
              </div>
            </SelectItem>
          ))}
          
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Autre</div>
          {ISSUING_SERVICES.filter(s => s.level === "Autre").map((service) => (
            <SelectItem key={service.value} value={service.value}>
              <div className="flex flex-col">
                <span className="font-medium">{service.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{service.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {value && (
        <p className="text-xs text-muted-foreground">
          {ISSUING_SERVICES.find(s => s.value === value)?.description}
        </p>
      )}
    </div>
  );
};

export { BuildingPermitIssuingServiceSelect, ISSUING_SERVICES };
export type { BuildingPermitIssuingService };
