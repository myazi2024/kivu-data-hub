import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  // Services provinciaux
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kinshasa", label: "DPUH Kinshasa", level: "Provincial", description: "Service provincial de l'urbanisme pour la ville-province de Kinshasa" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Nord-Kivu", label: "DPUH Nord-Kivu", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Nord-Kivu" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Sud-Kivu", label: "DPUH Sud-Kivu", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Sud-Kivu" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Haut-Katanga", label: "DPUH Haut-Katanga", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Haut-Katanga" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Lualaba", label: "DPUH Lualaba", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Lualaba" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kongo-Central", label: "DPUH Kongo-Central", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Kongo-Central" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kwilu", label: "DPUH Kwilu", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Kwilu" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kwango", label: "DPUH Kwango", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Kwango" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Mai-Ndombe", label: "DPUH Mai-Ndombe", level: "Provincial", description: "Service provincial de l'urbanisme pour la province de Mai-Ndombe" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kasaï", label: "DPUH Kasaï", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Kasaï" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kasaï-Central", label: "DPUH Kasaï-Central", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Kasaï-Central" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Kasaï-Oriental", label: "DPUH Kasaï-Oriental", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Kasaï-Oriental" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Lomami", label: "DPUH Lomami", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Lomami" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Sankuru", label: "DPUH Sankuru", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Sankuru" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Maniema", label: "DPUH Maniema", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Maniema" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Tanganyika", label: "DPUH Tanganyika", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Tanganyika" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Haut-Lomami", label: "DPUH Haut-Lomami", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Haut-Lomami" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Ituri", label: "DPUH Ituri", level: "Provincial", description: "Service provincial de l'urbanisme pour la province de l'Ituri" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Tshopo", label: "DPUH Tshopo", level: "Provincial", description: "Service provincial de l'urbanisme pour la province de la Tshopo" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Bas-Uele", label: "DPUH Bas-Uele", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Bas-Uele" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Haut-Uele", label: "DPUH Haut-Uele", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Haut-Uele" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Équateur", label: "DPUH Équateur", level: "Provincial", description: "Service provincial de l'urbanisme pour la province de l'Équateur" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Mongala", label: "DPUH Mongala", level: "Provincial", description: "Service provincial de l'urbanisme pour la province de la Mongala" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Nord-Ubangi", label: "DPUH Nord-Ubangi", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Nord-Ubangi" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Sud-Ubangi", label: "DPUH Sud-Ubangi", level: "Provincial", description: "Service provincial de l'urbanisme pour la province du Sud-Ubangi" },
  { value: "Division Provinciale de l'Urbanisme et Habitat - Tshuapa", label: "DPUH Tshuapa", level: "Provincial", description: "Service provincial de l'urbanisme pour la province de la Tshuapa" },
  // Services communaux
  { value: "Service Communal d'Urbanisme - Gombe", label: "SCU Gombe (Kinshasa)", level: "Communal", description: "Service communal d'urbanisme de la commune de Gombe" },
  { value: "Service Communal d'Urbanisme - Limete", label: "SCU Limete (Kinshasa)", level: "Communal", description: "Service communal d'urbanisme de la commune de Limete" },
  { value: "Service Communal d'Urbanisme - Goma", label: "SCU Goma (Nord-Kivu)", level: "Communal", description: "Service communal d'urbanisme de la commune de Goma" },
  { value: "Service Communal d'Urbanisme - Karisimbi", label: "SCU Karisimbi (Nord-Kivu)", level: "Communal", description: "Service communal d'urbanisme de la commune de Karisimbi" },
  { value: "Service Communal d'Urbanisme - Ibanda", label: "SCU Ibanda (Sud-Kivu)", level: "Communal", description: "Service communal d'urbanisme de la commune d'Ibanda, Bukavu" },
  { value: "Service Communal d'Urbanisme - Lubumbashi", label: "SCU Lubumbashi (Haut-Katanga)", level: "Communal", description: "Service communal d'urbanisme de la commune de Lubumbashi" },
  { value: "Autre service d'urbanisme", label: "Autre service (à préciser)", level: "Autre", description: "Service d'urbanisme non listé ci-dessus" }
];

interface BuildingPermitIssuingServiceSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
}

const BuildingPermitIssuingServiceSelect: React.FC<BuildingPermitIssuingServiceSelectProps> = ({ 
  value, 
  onValueChange 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return ISSUING_SERVICES;
    const q = searchQuery.toLowerCase();
    return ISSUING_SERVICES.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.value.toLowerCase().includes(q) ||
      s.level.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const groupedLevels = ['National', 'Provincial', 'Communal', 'Autre'] as const;

  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={(v) => { onValueChange(v); setSearchQuery(''); }}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le service émetteur" />
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {/* Search input */}
          <div className="px-2 py-1.5 sticky top-0 bg-popover z-10 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-7 rounded-lg"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              Aucun service trouvé
            </div>
          ) : (
            groupedLevels.map(level => {
              const items = filteredServices.filter(s => s.level === level);
              if (items.length === 0) return null;

              const levelLabels: Record<string, string> = {
                National: 'Services Nationaux',
                Provincial: 'Services Provinciaux',
                Communal: 'Services Communaux',
                Autre: 'Autre',
              };

              return (
                <React.Fragment key={level}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                    {levelLabels[level]}
                  </div>
                  {items.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{service.label}</span>
                        <span className="text-xs text-muted-foreground hidden sm:block">{service.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </React.Fragment>
              );
            })
          )}
        </SelectContent>
      </Select>
      
    </div>
  );
};

export { BuildingPermitIssuingServiceSelect, ISSUING_SERVICES };
export type { BuildingPermitIssuingService };
