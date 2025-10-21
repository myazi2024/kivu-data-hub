import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Receipt, Upload, X } from 'lucide-react';
import { TaxRecord } from '@/hooks/useCCCFormState';

interface CCCFormTaxesProps {
  taxes: TaxRecord[];
  onUpdate: (index: number, field: keyof TaxRecord, value: string | File | null) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  highlightIncomplete?: boolean;
}

export const CCCFormTaxes: React.FC<CCCFormTaxesProps> = ({
  taxes,
  onUpdate,
  onAdd,
  onRemove,
  highlightIncomplete = false
}) => {
  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdate(index, 'receiptFile', file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Historique des taxes</h3>
      </div>

      {taxes.map((tax, index) => (
        <Card 
          key={index} 
          className={`p-4 sm:p-6 space-y-4 transition-colors ${
            highlightIncomplete && (!tax.taxType || !tax.taxYear || !tax.taxAmount) 
              ? 'border-destructive bg-destructive/5' 
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Taxe {index + 1}
            </span>
            {taxes.length > 1 && (
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
              <Label htmlFor={`tax-${index}-type`} className="text-sm">
                Type de taxe <span className="text-destructive">*</span>
              </Label>
              <Select
                value={tax.taxType}
                onValueChange={(value) => onUpdate(index, 'taxType', value)}
              >
                <SelectTrigger id={`tax-${index}-type`} className="touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Taxe foncière">Taxe foncière</SelectItem>
                  <SelectItem value="Impôt locatif">Impôt locatif</SelectItem>
                  <SelectItem value="Taxe d'habitation">Taxe d'habitation</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`tax-${index}-year`} className="text-sm">
                Année <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`tax-${index}-year`}
                type="number"
                min="2000"
                max="2099"
                value={tax.taxYear}
                onChange={(e) => onUpdate(index, 'taxYear', e.target.value)}
                placeholder="2024"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`tax-${index}-amount`} className="text-sm">
                Montant (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`tax-${index}-amount`}
                type="number"
                step="0.01"
                value={tax.taxAmount}
                onChange={(e) => onUpdate(index, 'taxAmount', e.target.value)}
                placeholder="0.00"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`tax-${index}-status`} className="text-sm">
                Statut de paiement
              </Label>
              <Select
                value={tax.paymentStatus}
                onValueChange={(value) => onUpdate(index, 'paymentStatus', value)}
              >
                <SelectTrigger id={`tax-${index}-status`} className="touch-manipulation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="Payée">Payée</SelectItem>
                  <SelectItem value="Non payée">Non payée</SelectItem>
                  <SelectItem value="En retard">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`tax-${index}-date`} className="text-sm">
                Date de paiement
              </Label>
              <Input
                id={`tax-${index}-date`}
                type="date"
                value={tax.paymentDate}
                onChange={(e) => onUpdate(index, 'paymentDate', e.target.value)}
                className="touch-manipulation"
              />
            </div>

            {/* Receipt File */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm">Reçu de paiement</Label>
              {tax.receiptFile ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent/50">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">{tax.receiptFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdate(index, 'receiptFile', null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(index, e)}
                    className="hidden"
                    id={`tax-${index}-file`}
                  />
                  <Label
                    htmlFor={`tax-${index}-file`}
                    className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Joindre un reçu</span>
                  </Label>
                </div>
              )}
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
        Ajouter une taxe
      </Button>
    </div>
  );
};
