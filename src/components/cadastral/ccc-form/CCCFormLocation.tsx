import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin } from 'lucide-react';
import {
  getAllProvinces,
  getVillesForProvince,
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier
} from '@/lib/geographicData';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';

interface CCCFormLocationProps {
  formData: Partial<CadastralContributionData>;
  onUpdate: (field: keyof CadastralContributionData, value: any) => void;
  sectionType: 'urbaine' | 'rurale' | '';
  onSectionTypeChange: (type: 'urbaine' | 'rurale') => void;
}

export const CCCFormLocation: React.FC<CCCFormLocationProps> = ({
  formData,
  onUpdate,
  sectionType,
  onSectionTypeChange
}) => {
  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);
  const [availableAvenues, setAvailableAvenues] = useState<string[]>([]);

  const provinces = getAllProvinces();

  // Update dependent dropdowns
  useEffect(() => {
    if (formData.province) {
      setAvailableVilles(getVillesForProvince(formData.province));
      setAvailableTerritoires(getTerritoiresForProvince(formData.province));
    }
  }, [formData.province]);

  useEffect(() => {
    if (formData.province && formData.ville) {
      setAvailableCommunes(getCommunesForVille(formData.province, formData.ville));
    }
  }, [formData.province, formData.ville]);

  useEffect(() => {
    if (formData.province && formData.territoire) {
      setAvailableCollectivites(getCollectivitesForTerritoire(formData.province, formData.territoire));
    }
  }, [formData.province, formData.territoire]);

  useEffect(() => {
    if (formData.province && formData.ville && formData.commune) {
      setAvailableQuartiers(getQuartiersForCommune(formData.province, formData.ville, formData.commune));
    }
  }, [formData.province, formData.ville, formData.commune]);

  useEffect(() => {
    if (formData.province && formData.ville && formData.commune && formData.quartier) {
      setAvailableAvenues(getAvenuesForQuartier(formData.province, formData.ville, formData.commune, formData.quartier));
    }
  }, [formData.province, formData.ville, formData.commune, formData.quartier]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Localisation</h3>
      </div>

      {/* Section Type */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Type de section</Label>
        <RadioGroup
          value={sectionType}
          onValueChange={(value: 'urbaine' | 'rurale') => onSectionTypeChange(value)}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex items-center space-x-2 bg-accent/50 p-3 rounded-lg flex-1">
            <RadioGroupItem value="urbaine" id="urbaine" />
            <Label htmlFor="urbaine" className="cursor-pointer font-normal flex-1">
              Section Urbaine (SU)
            </Label>
          </div>
          <div className="flex items-center space-x-2 bg-accent/50 p-3 rounded-lg flex-1">
            <RadioGroupItem value="rurale" id="rurale" />
            <Label htmlFor="rurale" className="cursor-pointer font-normal flex-1">
              Section Rurale (SR)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Province */}
      <div className="space-y-2">
        <Label htmlFor="province" className="text-sm">Province</Label>
        <Select
          value={formData.province}
          onValueChange={(value) => onUpdate('province', value)}
        >
          <SelectTrigger id="province" className="touch-manipulation">
            <SelectValue placeholder="Sélectionner une province" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[300px]">
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sectionType === 'urbaine' ? (
        <>
          {/* Urban Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ville" className="text-sm">Ville</Label>
              <Select
                value={formData.ville}
                onValueChange={(value) => onUpdate('ville', value)}
                disabled={!formData.province}
              >
                <SelectTrigger id="ville" className="touch-manipulation">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {availableVilles.map((ville) => (
                    <SelectItem key={ville} value={ville}>
                      {ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune" className="text-sm">Commune</Label>
              <Select
                value={formData.commune}
                onValueChange={(value) => onUpdate('commune', value)}
                disabled={!formData.ville}
              >
                <SelectTrigger id="commune" className="touch-manipulation">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {availableCommunes.map((commune) => (
                    <SelectItem key={commune} value={commune}>
                      {commune}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quartier" className="text-sm">Quartier</Label>
              <Select
                value={formData.quartier}
                onValueChange={(value) => onUpdate('quartier', value)}
                disabled={!formData.commune}
              >
                <SelectTrigger id="quartier" className="touch-manipulation">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {availableQuartiers.map((quartier) => (
                    <SelectItem key={quartier} value={quartier}>
                      {quartier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avenue" className="text-sm">Avenue</Label>
              <Select
                value={formData.avenue}
                onValueChange={(value) => onUpdate('avenue', value)}
                disabled={!formData.quartier}
              >
                <SelectTrigger id="avenue" className="touch-manipulation">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {availableAvenues.map((avenue) => (
                    <SelectItem key={avenue} value={avenue}>
                      {avenue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      ) : sectionType === 'rurale' ? (
        <>
          {/* Rural Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="territoire" className="text-sm">Territoire</Label>
              <Select
                value={formData.territoire}
                onValueChange={(value) => onUpdate('territoire', value)}
                disabled={!formData.province}
              >
                <SelectTrigger id="territoire" className="touch-manipulation">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {availableTerritoires.map((territoire) => (
                    <SelectItem key={territoire} value={territoire}>
                      {territoire}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collectivite" className="text-sm">Collectivité</Label>
              <Select
                value={formData.collectivite}
                onValueChange={(value) => onUpdate('collectivite', value)}
                disabled={!formData.territoire}
              >
                <SelectTrigger id="collectivite" className="touch-manipulation">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="bg-background max-h-[300px]">
                  {availableCollectivites.map((collectivite) => (
                    <SelectItem key={collectivite} value={collectivite}>
                      {collectivite}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupement" className="text-sm">Groupement</Label>
              <Input
                id="groupement"
                value={formData.groupement || ''}
                onChange={(e) => onUpdate('groupement', e.target.value)}
                placeholder="Nom du groupement"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="village" className="text-sm">Village</Label>
              <Input
                id="village"
                value={formData.village || ''}
                onChange={(e) => onUpdate('village', e.target.value)}
                placeholder="Nom du village"
                className="touch-manipulation"
              />
            </div>
          </div>
        </>
      ) : null}

      {/* Common fields */}
      <div className="space-y-2">
        <Label htmlFor="whatsappNumber" className="text-sm">Numéro WhatsApp (optionnel)</Label>
        <Input
          id="whatsappNumber"
          type="tel"
          value={formData.whatsappNumber || ''}
          onChange={(e) => onUpdate('whatsappNumber', e.target.value)}
          placeholder="+243 XXX XXX XXX"
          className="touch-manipulation"
        />
      </div>
    </div>
  );
};
