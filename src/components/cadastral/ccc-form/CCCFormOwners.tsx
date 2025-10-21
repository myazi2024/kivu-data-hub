import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, User } from 'lucide-react';
import { FormOwner } from '@/hooks/useCCCFormState';

interface CCCFormOwnersProps {
  owners: FormOwner[];
  onUpdate: (index: number, field: keyof FormOwner, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  highlightIncomplete?: boolean;
}

export const CCCFormOwners: React.FC<CCCFormOwnersProps> = ({
  owners,
  onUpdate,
  onAdd,
  onRemove,
  highlightIncomplete = false
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Propriétaire(s) actuel(s)</h3>
      </div>

      {owners.map((owner, index) => (
        <Card 
          key={index} 
          className={`p-4 sm:p-6 space-y-4 transition-colors ${
            highlightIncomplete && (!owner.lastName || !owner.firstName) 
              ? 'border-destructive bg-destructive/5' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Propriétaire {index + 1}
            </span>
            {owners.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`owner-${index}-lastName`} className="text-sm">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`owner-${index}-lastName`}
                value={owner.lastName}
                onChange={(e) => onUpdate(index, 'lastName', e.target.value)}
                placeholder="Nom de famille"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`owner-${index}-firstName`} className="text-sm">
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`owner-${index}-firstName`}
                value={owner.firstName}
                onChange={(e) => onUpdate(index, 'firstName', e.target.value)}
                placeholder="Prénom"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`owner-${index}-middleName`} className="text-sm">
                Post-nom
              </Label>
              <Input
                id={`owner-${index}-middleName`}
                value={owner.middleName}
                onChange={(e) => onUpdate(index, 'middleName', e.target.value)}
                placeholder="Post-nom"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`owner-${index}-legalStatus`} className="text-sm">
                Statut juridique
              </Label>
              <Select
                value={owner.legalStatus}
                onValueChange={(value) => onUpdate(index, 'legalStatus', value)}
              >
                <SelectTrigger id={`owner-${index}-legalStatus`} className="touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Personne physique">Personne physique</SelectItem>
                  <SelectItem value="Personne morale">Personne morale</SelectItem>
                  <SelectItem value="Entreprise">Entreprise</SelectItem>
                  <SelectItem value="Association">Association</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`owner-${index}-since`} className="text-sm">
                Propriétaire depuis
              </Label>
              <Input
                id={`owner-${index}-since`}
                type="date"
                value={owner.since}
                onChange={(e) => onUpdate(index, 'since', e.target.value)}
                className="touch-manipulation"
              />
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full sm:w-auto touch-manipulation min-h-[44px]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un copropriétaire
      </Button>
    </div>
  );
};
