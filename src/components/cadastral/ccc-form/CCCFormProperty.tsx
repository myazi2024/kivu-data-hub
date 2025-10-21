import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Home, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import { ParcelSide } from '@/hooks/useCCCFormState';

interface CCCFormPropertyProps {
  formData: Partial<CadastralContributionData>;
  onUpdate: (field: keyof CadastralContributionData, value: any) => void;
  parcelSides: ParcelSide[];
  onUpdateSide: (index: number, value: string) => void;
  onAddSide: () => void;
  onRemoveSide: (index: number) => void;
}

export const CCCFormProperty: React.FC<CCCFormPropertyProps> = ({
  formData,
  onUpdate,
  parcelSides,
  onUpdateSide,
  onAddSide,
  onRemoveSide
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Home className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Informations de la propriété</h3>
      </div>

      {/* Dimensions */}
      <Card className="p-4 sm:p-6 space-y-4">
        <h4 className="font-medium text-sm">Dimensions de la parcelle</h4>
        {parcelSides.map((side, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`side-${index}`} className="text-sm">
                {side.name}
              </Label>
              <Input
                id={`side-${index}`}
                type="number"
                step="0.01"
                value={side.length}
                onChange={(e) => onUpdateSide(index, e.target.value)}
                placeholder="Longueur en mètres"
                className="touch-manipulation"
              />
            </div>
            {parcelSides.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveSide(index)}
                className="h-10 w-10 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddSide}
          className="w-full sm:w-auto touch-manipulation"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un côté
        </Button>
      </Card>

      {/* Area */}
      <div className="space-y-2">
        <Label htmlFor="areaSqm" className="text-sm">
          Superficie (m²)
        </Label>
        <Input
          id="areaSqm"
          type="number"
          step="0.01"
          value={formData.areaSqm || ''}
          onChange={(e) => onUpdate('areaSqm', parseFloat(e.target.value) || '')}
          placeholder="Calculée automatiquement ou saisir manuellement"
          className="touch-manipulation"
        />
        <p className="text-xs text-muted-foreground">
          La superficie est calculée automatiquement selon les dimensions saisies
        </p>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="declaredUsage" className="text-sm">
            Usage déclaré
          </Label>
          <Select
            value={formData.declaredUsage}
            onValueChange={(value) => onUpdate('declaredUsage', value)}
          >
            <SelectTrigger id="declaredUsage" className="touch-manipulation">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="Résidentiel">Résidentiel</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Industriel">Industriel</SelectItem>
              <SelectItem value="Agricole">Agricole</SelectItem>
              <SelectItem value="Mixte">Mixte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="constructionType" className="text-sm">
            Type de construction
          </Label>
          <Select
            value={formData.constructionType}
            onValueChange={(value) => onUpdate('constructionType', value)}
          >
            <SelectTrigger id="constructionType" className="touch-manipulation">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="Villa">Villa</SelectItem>
              <SelectItem value="Appartement">Appartement</SelectItem>
              <SelectItem value="Immeuble">Immeuble</SelectItem>
              <SelectItem value="Commerce">Commerce</SelectItem>
              <SelectItem value="Entrepôt">Entrepôt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* WhatsApp Contact */}
      <div className="space-y-2">
        <Label htmlFor="whatsappNumber" className="text-sm">
          Numéro WhatsApp (optionnel)
        </Label>
        <Input
          id="whatsappNumber"
          type="tel"
          value={formData.whatsappNumber || ''}
          onChange={(e) => onUpdate('whatsappNumber', e.target.value)}
          placeholder="+243 XXX XXX XXX"
          className="touch-manipulation"
        />
        <p className="text-xs text-muted-foreground">
          Pour être contacté concernant cette contribution
        </p>
      </div>
    </div>
  );
};
