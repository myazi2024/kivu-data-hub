import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Info, X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import BlockResetButton from '../BlockResetButton';
import { MdAccountBalance, MdInsertDriveFile } from 'react-icons/md';
import { CadastralContributionData } from '@/hooks/useCadastralContribution';
import LandDisputeReportForm from '../LandDisputeReportForm';

export interface TaxRecord {
  taxType: string;
  taxYear: string;
  taxAmount: string;
  paymentStatus: string;
  paymentDate: string;
  remainingAmount?: string;
  receiptFile: File | null;
  existingReceiptUrl?: string;
  /**
   * Référence de la construction concernée pour l'IRL.
   * - 'main' : construction principale (onglet Infos)
   * - 'additional:<index>' : construction additionnelle (index dans additionalConstructions)
   * Obligatoire uniquement quand taxType === 'Impôt sur les revenus locatifs'.
   */
  constructionRef?: string;
}

/**
 * Helpers IRL : libellé d'une construction et liste des refs en Location.
 */
export const buildRentalConstructionRefs = (
  declaredUsage: string | undefined,
  additionalConstructions: Array<{ declaredUsage?: string; propertyCategory?: string; constructionType?: string; constructionYear?: number }> = []
): { ref: string; label: string }[] => {
  const refs: { ref: string; label: string }[] = [];
  if (declaredUsage === 'Location') {
    refs.push({ ref: 'main', label: 'Construction principale' });
  }
  additionalConstructions.forEach((c, idx) => {
    if (c?.declaredUsage === 'Location') {
      const parts = [
        c.propertyCategory || c.constructionType || 'Construction',
        c.constructionYear ? String(c.constructionYear) : null,
      ].filter(Boolean);
      refs.push({ ref: `additional:${idx}`, label: `Construction #${idx + 2} (${parts.join(', ')})` });
    }
  });
  return refs;
};

export interface MortgageRecord {
  mortgageAmount: string;
  duration: string;
  creditorName: string;
  creditorType: string;
  contractDate: string;
  mortgageStatus: string;
  receiptFile: File | null;
  existingReceiptUrl?: string;
}

interface ObligationsTabProps {
  parcelNumber: string;
  parcelId?: string;
  formData: CadastralContributionData;
  /** Constructions additionnelles — source de vérité pour le picklist IRL */
  additionalConstructions?: Array<{ declaredUsage?: string; propertyCategory?: string; constructionType?: string; constructionYear?: number }>;
  obligationType: 'taxes' | 'mortgages' | 'disputes';
  setObligationType: (v: 'taxes' | 'mortgages' | 'disputes') => void;
  // Tax
  taxRecords: TaxRecord[];
  updateTaxRecord: (index: number, field: string, value: string) => void;
  addTaxRecord: () => void;
  removeTaxRecord: (index: number) => void;
  handleTaxFileChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeTaxFile: (index: number) => void;
  showTaxWarning: boolean;
  highlightIncompleteTax: boolean;
  // Mortgage
  hasMortgage: boolean | null;
  setHasMortgage: (v: boolean | null) => void;
  mortgageRecords: MortgageRecord[];
  setMortgageRecords: React.Dispatch<React.SetStateAction<MortgageRecord[]>>;
  updateMortgageRecord: (index: number, field: string, value: string) => void;
  addMortgageRecord: () => void;
  removeMortgageRecord: (index: number) => void;
  handleMortgageFileChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeMortgageFile: (index: number) => void;
  showMortgageWarning: boolean;
  highlightIncompleteMortgage: boolean;
  // Dispute
  hasDispute: boolean | null;
  setHasDispute: (v: boolean | null) => void;
  onDisputeDataChange?: (data: any) => void;
  // Picklists
  getPicklistOptions: (key: string) => string[];
  // Navigation
  handleTabChange: (tab: string) => void;
  handleNextTab: (current: string, next: string) => void;
  resetTaxBlock: () => void;
  resetMortgageBlock: () => void;
}

const ObligationsTab: React.FC<ObligationsTabProps> = ({
  parcelNumber, parcelId,
  formData, additionalConstructions, obligationType, setObligationType,
  taxRecords, updateTaxRecord, addTaxRecord, removeTaxRecord,
  handleTaxFileChange, removeTaxFile, showTaxWarning, highlightIncompleteTax,
  hasMortgage, setHasMortgage, mortgageRecords, setMortgageRecords,
  updateMortgageRecord, addMortgageRecord, removeMortgageRecord,
  handleMortgageFileChange, removeMortgageFile, showMortgageWarning, highlightIncompleteMortgage,
  hasDispute, setHasDispute, onDisputeDataChange,
  getPicklistOptions, handleTabChange, handleNextTab,
  resetTaxBlock, resetMortgageBlock
}) => {
  return (
    <div className="space-y-3 mt-4 animate-fade-in">
      {/* Toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit shadow-inner mx-auto">
        <Button type="button" variant={obligationType === 'taxes' ? 'default' : 'ghost'} size="sm" onClick={() => setObligationType('taxes')} className="text-sm h-8">Taxes</Button>
        <Button type="button" variant={obligationType === 'mortgages' ? 'default' : 'ghost'} size="sm" onClick={() => setObligationType('mortgages')} className="text-sm h-8">Hypothèques</Button>
        <Button type="button" variant={obligationType === 'disputes' ? 'default' : 'ghost'} size="sm" onClick={() => setObligationType('disputes')} className="text-sm h-8">Litiges</Button>
      </div>

      {/* Taxes */}
      {obligationType === 'taxes' && (
        <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MdAccountBalance className="h-3.5 w-3.5 text-primary" />
                </div>
                <Label className="text-sm font-semibold">Historique fiscal</Label>
              </div>
              <div className="flex items-center gap-1">
                <BlockResetButton blockName="Historique fiscal" onReset={resetTaxBlock} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                  </PopoverTrigger>
                   <PopoverContent className="w-72 rounded-xl z-[10001]" align="end">
                    <div className="space-y-2 text-xs">
                      <h4 className="font-semibold text-sm">Taxes (optionnel)</h4>
                      <p className="text-muted-foreground">Documentez les taxes payées pour prouver la conformité fiscale.</p>
                      <p className="text-muted-foreground"><strong>💡</strong> Joignez les reçus si possible.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {taxRecords.map((tax, index) => (
              <div key={index} className={`border-2 rounded-2xl p-3 space-y-2 bg-card shadow-sm transition-all duration-300 ${highlightIncompleteTax && index === 0 ? 'ring-2 ring-amber-500 animate-pulse' : 'border-border'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-sm font-semibold text-foreground">Taxe #{index + 1}</span>
                  {taxRecords.length > 1 && index > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeTaxRecord(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Type</Label>
                    <Select value={tax.taxType} onValueChange={(value) => updateTaxRecord(index, 'taxType', value)}>
                      <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {(() => {
                          const additional = additionalConstructions ?? (Array.isArray((formData as any).additionalConstructions) ? (formData as any).additionalConstructions : []);
                          const hasAnyRental = formData.declaredUsage === 'Location' || additional.some((c: any) => c?.declaredUsage === 'Location');
                          return ['Impôt foncier annuel', ...(hasAnyRental ? ['Impôt sur les revenus locatifs'] : [])].map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Année</Label>
                    <Select value={tax.taxYear} onValueChange={(value) => updateTaxRecord(index, 'taxYear', value)}>
                      <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Année" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          const yearStr = year.toString();
                          // Block year if same taxType+year already declared "Payé" in another record
                          const isBlocked = tax.taxType && taxRecords.some((other, otherIdx) =>
                            otherIdx !== index &&
                            other.taxType === tax.taxType &&
                            other.taxYear === yearStr &&
                            other.paymentStatus === 'Payé'
                          );
                          return (
                            <SelectItem key={year} value={yearStr} disabled={isBlocked}>
                              {year}{isBlocked ? ' (déjà payé)' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* IRL : sélecteur de la construction concernée (1 IRL ↔ 1 construction Location) */}
                {tax.taxType === 'Impôt sur les revenus locatifs' && (() => {
                  const allRefs = buildRentalConstructionRefs(
                    formData.declaredUsage,
                    Array.isArray(additionalConstructions) ? additionalConstructions : []
                  );
                  const usedRefs = new Set(
                    taxRecords
                      .filter((t, i) => i !== index && t.taxType === 'Impôt sur les revenus locatifs' && t.constructionRef)
                      .map(t => t.constructionRef as string)
                  );
                  const isMissing = !tax.constructionRef;
                  return (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">
                        Construction concernée <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={tax.constructionRef || ''}
                        onValueChange={(value) => updateTaxRecord(index, 'constructionRef', value)}
                      >
                        <SelectTrigger className={`h-10 text-sm rounded-xl ${isMissing ? 'border-destructive ring-1 ring-destructive/40' : ''}`}>
                          <SelectValue placeholder="Sélectionner la construction louée" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {allRefs.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucune construction en location.</div>
                          ) : (
                            allRefs.map(opt => {
                              const taken = usedRefs.has(opt.ref) && opt.ref !== tax.constructionRef;
                              return (
                                <SelectItem key={opt.ref} value={opt.ref} disabled={taken}>
                                  {opt.label}{taken ? ' (déjà déclarée)' : ''}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        L'IRL est rattaché à une construction louée précise. 1 IRL par construction en location.
                      </p>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Montant (USD)</Label>
                    {(() => {
                      // Find if this is a complement of a "Payé partiellement" record
                      const partialMatch = tax.taxType && tax.taxYear
                        ? taxRecords.find((other, otherIdx) =>
                            otherIdx !== index &&
                            other.taxType === tax.taxType &&
                            other.taxYear === tax.taxYear &&
                            other.paymentStatus === 'Payé partiellement' &&
                            other.remainingAmount
                          )
                        : null;
                      const maxAmount = partialMatch ? parseFloat(partialMatch.remainingAmount || '0') : undefined;
                      return (
                        <Input
                          type="number"
                          placeholder={maxAmount ? `Max: ${maxAmount}` : "150"}
                          value={tax.taxAmount}
                          max={maxAmount}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (maxAmount && parseFloat(val) > maxAmount) {
                              val = maxAmount.toString();
                            }
                            updateTaxRecord(index, 'taxAmount', val);
                          }}
                          className="h-10 text-sm rounded-xl"
                        />
                      );
                    })()}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Statut</Label>
                    <Select value={tax.paymentStatus} onValueChange={(value) => updateTaxRecord(index, 'paymentStatus', value)}>
                      <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Payé">Payé</SelectItem>
                        <SelectItem value="Payé partiellement">Payé partiellement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {tax.paymentStatus === 'Payé partiellement' && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Montant restant à payer (USD)</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={tax.taxAmount ? parseFloat(tax.taxAmount) : undefined}
                      placeholder="Ex: 50.00"
                      value={tax.remainingAmount || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        const paidAmount = parseFloat(tax.taxAmount || '0');
                        // FIX: remaining cannot exceed the paid amount
                        if (paidAmount > 0 && parseFloat(val) > paidAmount) {
                          val = paidAmount.toString();
                        }
                        updateTaxRecord(index, 'remainingAmount', val);
                      }}
                      className="h-10 text-sm rounded-xl"
                    />
                    {tax.taxAmount && tax.remainingAmount && parseFloat(tax.remainingAmount) >= parseFloat(tax.taxAmount) && (
                      <p className="text-xs text-destructive">Le montant restant ne peut pas dépasser le montant payé ({tax.taxAmount} USD)</p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Date paiement</Label>
                  <Input type="date" max={new Date().toISOString().split('T')[0]} value={tax.paymentDate} onChange={(e) => updateTaxRecord(index, 'paymentDate', e.target.value)} className="h-10 text-sm rounded-xl" />
                </div>

                <div className="space-y-1 pt-2 border-t border-border/50">
                  <Label className="text-sm font-medium">Reçu (optionnel)</Label>
                  {!tax.receiptFile ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`taxFile-${index}`)?.click()} className="gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2">
                      <Plus className="h-4 w-4" /> Ajouter reçu
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                      <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{tax.receiptFile.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTaxFile(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Input id={`taxFile-${index}`} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={(e) => handleTaxFileChange(index, e)} className="hidden" />
                </div>
              </div>
            ))}

            {showTaxWarning && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                <p className="text-xs text-amber-700 dark:text-amber-300">⚠️ Complétez la taxe avant d'en ajouter une nouvelle.</p>
              </div>
            )}

            <Button type="button" variant="outline" onClick={addTaxRecord} className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all">
              <Plus className="h-4 w-4" /> Ajouter une taxe
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Mortgages */}
      {obligationType === 'mortgages' && (
        <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MdAccountBalance className="h-3.5 w-3.5 text-primary" />
                </div>
                <Label className="text-sm font-semibold">Hypothèque</Label>
              </div>
              <div className="flex items-center gap-1">
                <BlockResetButton blockName="Hypothèque" onReset={resetMortgageBlock} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 rounded-full hover:bg-transparent">
                      <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 rounded-xl z-[10001]" align="end">
                    <div className="space-y-2 text-xs">
                      <h4 className="font-semibold text-sm">Statut hypothécaire</h4>
                      <p className="text-muted-foreground">Indiquez si cette parcelle est grevée d'une hypothèque active.</p>
                      <p className="text-muted-foreground"><strong>💡</strong> Cette information est importante pour les acheteurs potentiels.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="border-2 rounded-2xl p-3 space-y-3 bg-card shadow-sm">
              <Label className="text-sm font-medium">Y a-t-il une hypothèque active sur cette parcelle ?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={hasMortgage === true ? "default" : "outline"} onClick={() => setHasMortgage(true)} className={`h-10 text-sm rounded-xl transition-all ${hasMortgage === true ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"}`}>Oui</Button>
                <Button type="button" variant={hasMortgage === false ? "default" : "outline"} onClick={() => { setHasMortgage(false); setMortgageRecords([{ mortgageAmount: '', duration: '', creditorName: '', creditorType: 'Banque', contractDate: '', mortgageStatus: 'Active', receiptFile: null }]); }} className={`h-10 text-sm rounded-xl transition-all ${hasMortgage === false ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"}`}>Non</Button>
              </div>
              {hasMortgage === false && (
                <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl p-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">Aucune hypothèque active - parcelle libre de charges</p>
                </div>
              )}
            </div>

            {hasMortgage === true && (
              <>
                {mortgageRecords.map((mortgage, index) => (
                  <div key={index} className={`border-2 rounded-2xl p-3 space-y-2 bg-card shadow-sm transition-all duration-300 ${highlightIncompleteMortgage && index === 0 ? 'ring-2 ring-amber-500 animate-pulse' : 'border-border'}`}>
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <span className="text-sm font-semibold text-foreground">Hypothèque #{index + 1}</span>
                      {mortgageRecords.length > 1 && index > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeMortgageRecord(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-xl">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Montant (USD)</Label>
                        <Input type="number" placeholder="50000" value={mortgage.mortgageAmount} onChange={(e) => updateMortgageRecord(index, 'mortgageAmount', e.target.value)} className="h-10 text-sm rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Durée (mois)</Label>
                        <Input type="number" placeholder="120" value={mortgage.duration} onChange={(e) => updateMortgageRecord(index, 'duration', e.target.value)} className="h-10 text-sm rounded-xl" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Créancier</Label>
                        <Input placeholder="ex: Banque XYZ" value={mortgage.creditorName} onChange={(e) => updateMortgageRecord(index, 'creditorName', e.target.value)} className="h-10 text-sm rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Type</Label>
                        <Select value={mortgage.creditorType} onValueChange={(value) => updateMortgageRecord(index, 'creditorType', value)}>
                          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {getPicklistOptions('picklist_creditor_type').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Date contrat</Label>
                        <Input type="date" max={new Date().toISOString().split('T')[0]} value={mortgage.contractDate} onChange={(e) => updateMortgageRecord(index, 'contractDate', e.target.value)} className="h-10 text-sm rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Statut</Label>
                        <Select value={mortgage.mortgageStatus} onValueChange={(value) => updateMortgageRecord(index, 'mortgageStatus', value)}>
                          <SelectTrigger className="h-10 text-sm rounded-xl"><SelectValue placeholder="Statut" /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {getPicklistOptions('picklist_mortgage_status').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-border/50">
                      <Label className="text-sm font-medium">Justificatif (optionnel)</Label>
                      {!mortgage.receiptFile ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`mortgageFile-${index}`)?.click()} className="gap-2 w-full text-sm h-9 rounded-xl border-dashed border-2">
                          <Plus className="h-4 w-4" /> Ajouter justificatif
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl border overflow-hidden min-w-0">
                          <MdInsertDriveFile className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm flex-1 truncate overflow-hidden min-w-0">{mortgage.receiptFile.name}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeMortgageFile(index)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Input id={`mortgageFile-${index}`} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" onChange={(e) => handleMortgageFileChange(index, e)} className="hidden" />
                    </div>
                  </div>
                ))}

                {showMortgageWarning && (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300">⚠️ Complétez l'hypothèque avant d'en ajouter une nouvelle.</p>
                  </div>
                )}

                <Button type="button" variant="outline" onClick={addMortgageRecord} className="w-full h-10 gap-2 text-sm font-medium rounded-2xl border-2 border-dashed hover:bg-primary/5 hover:border-primary transition-all">
                  <Plus className="h-4 w-4" /> Ajouter une hypothèque
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Litiges */}
      {obligationType === 'disputes' && (
        <Card className="max-w-[360px] mx-auto rounded-2xl shadow-md border-border/50 overflow-hidden">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                <MdAccountBalance className="h-3.5 w-3.5 text-primary" />
              </div>
              <Label className="text-sm font-semibold">Litige foncier</Label>
            </div>

            <div className="border-2 rounded-2xl p-3 space-y-3 bg-card shadow-sm">
              <Label className="text-sm font-medium">Y a-t-il un litige foncier en cours sur cette parcelle ?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={hasDispute === true ? "default" : "outline"} onClick={() => setHasDispute(true)} className={`h-10 text-sm rounded-xl transition-all ${hasDispute === true ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"}`}>Oui</Button>
                <Button type="button" variant={hasDispute === false ? "default" : "outline"} onClick={() => setHasDispute(false)} className={`h-10 text-sm rounded-xl transition-all ${hasDispute === false ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"}`}>Non</Button>
              </div>
              {hasDispute === false && (
                <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl p-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">Aucun litige en cours - parcelle sans contentieux</p>
                </div>
              )}
            </div>

            {hasDispute === true && (
              <LandDisputeReportForm
                parcelNumber={parcelNumber}
                parcelId={parcelId}
                open={true}
                onOpenChange={() => {}}
                embedded={true}
                onDisputeDataChange={onDisputeDataChange}
              />
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Navigation */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 px-1 -mx-1">
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => { if (obligationType === 'disputes') setObligationType('mortgages'); else if (obligationType === 'mortgages') setObligationType('taxes'); else handleTabChange('history'); }} className="gap-2 rounded-xl h-10 text-sm">
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          <Button type="button" onClick={() => { if (obligationType === 'taxes') setObligationType('mortgages'); else if (obligationType === 'mortgages') setObligationType('disputes'); else handleNextTab('obligations', 'review'); }} className="gap-2 rounded-xl h-10 text-sm shadow-md hover:shadow-lg transition-all">
            {obligationType === 'disputes' ? 'Reviser' : 'Suivant'} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ObligationsTab;
