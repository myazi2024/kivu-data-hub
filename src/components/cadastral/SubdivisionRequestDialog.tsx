import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Grid3X3, MapPin, Pencil, Eye, FileText, ChevronLeft, ChevronRight, Check, Loader2, Info, Trash2, Upload, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { useSubdivisionForm } from './subdivision/hooks/useSubdivisionForm';
import { SubdivisionStep } from './subdivision/types';
import StepParentParcel from './subdivision/steps/StepParentParcel';
import StepLotDesigner from './subdivision/steps/StepLotDesigner';
import StepPlanView from './subdivision/steps/StepPlanView';
import StepDocuments from './subdivision/steps/StepDocuments';
import StepInfrastructures from './subdivision/steps/StepInfrastructures';
import StepSummary from './subdivision/steps/StepSummary';
import StepZoningRules from './subdivision/steps/StepZoningRules';

interface SubdivisionRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_STEP_CONFIG: { key: SubdivisionStep; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { key: 'zoning', label: 'Normes de zonage', icon: <ShieldCheck className="h-3.5 w-3.5" />, shortLabel: 'Normes' },
  { key: 'parcel', label: 'Parcelle & Demandeur', icon: <MapPin className="h-3.5 w-3.5" />, shortLabel: 'Parcelle' },
  { key: 'designer', label: 'Conception des lots', icon: <Pencil className="h-3.5 w-3.5" />, shortLabel: 'Lots' },
  { key: 'plan', label: 'Plan personnalisé', icon: <Eye className="h-3.5 w-3.5" />, shortLabel: 'Plan' },
  { key: 'infrastructures', label: 'Infrastructures', icon: <Building2 className="h-3.5 w-3.5" />, shortLabel: 'Infra' },
  { key: 'documents', label: 'Pièces justificatives', icon: <Upload className="h-3.5 w-3.5" />, shortLabel: 'Docs' },
  { key: 'summary', label: 'Récapitulatif & paiement', icon: <FileText className="h-3.5 w-3.5" />, shortLabel: 'Envoi' },
];

const SubdivisionRequestDialog: React.FC<SubdivisionRequestDialogProps> = ({
  parcelNumber, parcelId, parcelData, open, onOpenChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  const form = useSubdivisionForm(parcelNumber, parcelData, user, parcelId);
  
  const handleClose = () => {
    if (form.lots.length > 0 && !form.submitted) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  };
  
  const handleIntroComplete = () => setShowIntro(false);
  
  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Authentification requise', description: 'Veuillez vous connecter.', variant: 'destructive' });
      return;
    }
    try {
      const result = await form.submit(user.id);
      if (!result) return;

      toast({
        title: 'Demande créée',
        description: `Référence ${result.reference_number} — redirection vers le paiement…`,
      });

      // Trigger Stripe checkout via shared create-payment edge
      const { data: payment, error: payError } = await supabase.functions.invoke('create-payment', {
        body: {
          invoice_id: result.id,
          payment_type: 'subdivision_request',
          amount_usd: result.total_amount_usd,
        },
      });

      if (payError || !payment?.url) {
        // Stripe unavailable → show fallback success screen with reference + dashboard link
        form.markSubmittedFallback();
        toast({
          title: 'Paiement indisponible',
          description: 'Vous pourrez régler depuis votre tableau de bord.',
          variant: 'destructive',
        });
        return;
      }
      window.location.href = payment.url as string;
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };
  
  if (!open) return null;
  
  if (showIntro) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={handleIntroComplete}
        config={FORM_INTRO_CONFIGS.subdivision}
      />
    );
  }
  
  const STEP_CONFIG = React.useMemo(
    () => ALL_STEP_CONFIG.filter(s => form.steps.includes(s.key)),
    [form.steps],
  );
  const currentStepIndex = STEP_CONFIG.findIndex(s => s.key === form.currentStep);
  const feeLabel = form.loadingFee || form.submissionFee == null
    ? '…'
    : `${form.submissionFee.toFixed(2)}$`;

  // Compute missing fields hint for current step
  const missingFields: string[] = (() => {
    if (form.isStepValid(form.currentStep)) return [];
    if (form.currentStep === 'parcel') {
      const m: string[] = [];
      const r = form.requester;
      if (!r.legalStatus) m.push('statut juridique');
      if (r.legalStatus === 'Personne physique') {
        if (!r.gender) m.push('genre');
        if (!r.lastName?.trim()) m.push('nom');
        if (!r.firstName?.trim()) m.push('prénom');
      }
      if (r.legalStatus === 'Personne morale') {
        if (!r.entityType) m.push("type d'entité");
        if (!r.lastName?.trim()) m.push('dénomination');
        if (!r.rccmNumber?.trim()) m.push('RCCM');
      }
      if (r.legalStatus === 'État') {
        if (!r.rightType) m.push('type de droit');
        if (!r.stateExploitedBy?.trim()) m.push('exploité par');
      }
      if (!r.nationality) m.push('nationalité');
      if (!r.phone?.trim()) m.push('téléphone');
      if (!r.type) m.push('qualité du demandeur');
      if (!form.purpose) m.push('motif');
      if (!form.parentParcel) m.push('parcelle introuvable');
      return m;
    }
    if (form.currentStep === 'designer') return ['au moins 1 lot valide'];
    if (form.currentStep === 'documents') return ['pièces obligatoires'];
    return [];
  })();
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-screen h-[100dvh] max-w-none p-0 gap-0 overflow-hidden rounded-none sm:w-auto sm:h-auto sm:max-w-3xl sm:max-h-[92vh] sm:rounded-2xl flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Grid3X3 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-bold truncate">
                  Lotissement — {parcelNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Créez votre plan de lotissement en {STEP_CONFIG.length} étapes
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {/* Draft restored notice */}
          {form.draftRestored && !form.submitted && (
            <div className="px-4 shrink-0">
              <Alert className="py-2 border-amber-500/30 bg-amber-50/50">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span>Brouillon restauré automatiquement.</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 self-start sm:self-auto" onClick={form.clearDraft}>
                    <Trash2 className="h-3 w-3" /> Effacer
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {/* Step navigation */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-2 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 scrollbar-thin">
              {STEP_CONFIG.map((step, index) => {
                const isActive = step.key === form.currentStep;
                const isDone = index < currentStepIndex;
                const isClickable = index <= currentStepIndex || form.isStepValid(STEP_CONFIG[Math.max(0, index - 1)].key);
                
                return (
                  <React.Fragment key={step.key}>
                    {index > 0 && (
                      <div className={`flex-shrink-0 w-2 sm:w-4 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />
                    )}
                    <button
                      onClick={() => isClickable && form.setCurrentStep(step.key)}
                      disabled={!isClickable}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all flex-shrink-0
                        ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : ''}
                        ${isDone ? 'text-primary hover:bg-primary/10' : ''}
                        ${!isActive && !isDone ? 'text-muted-foreground' : ''}
                        ${!isClickable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : step.icon}
                      <span>{step.shortLabel}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {form.currentStep === 'parcel' && (
              <StepParentParcel
                parentParcel={form.parentParcel}
                loadingParcel={form.loadingParcel}
                requester={form.requester}
                onRequesterChange={form.setRequester}
                purpose={form.purpose}
                onPurposeChange={form.setPurpose}
                parentEligibility={form.parentEligibility}
              />
            )}
            {form.currentStep === 'designer' && (
              <StepLotDesigner
                parentParcel={form.parentParcel}
                parentVertices={form.parentVertices}
                parentSides={form.parentParcel?.parcelSides}
                lots={form.lots}
                setLots={form.setLots}
                roads={form.roads}
                setRoads={form.setRoads}
                commonSpaces={form.commonSpaces}
                setCommonSpaces={form.setCommonSpaces}
                servitudes={form.servitudes}
                setServitudes={form.setServitudes}
                lotIds={form.lots.map(l => l.id)}
                validation={form.validation}
                canUndo={form.canUndo}
                canRedo={form.canRedo}
                onUndo={form.undo}
                onRedo={form.redo}
              />
            )}
            {form.currentStep === 'plan' && (
              <StepPlanView
                parentParcel={form.parentParcel}
                parentVertices={form.parentVertices}
                parentSides={form.parentParcel?.parcelSides}
                lots={form.lots}
                roads={form.roads}
                commonSpaces={form.commonSpaces}
                servitudes={form.servitudes}
                planElements={form.planElements}
                onPlanElementsChange={form.setPlanElements}
              />
            )}
            {form.currentStep === 'infrastructures' && (
              <StepInfrastructures
                sectionType={parcelData?.quartier ? 'urban' : (parcelData?.village ? 'rural' : 'urban')}
                selections={form.selectedInfrastructures}
                onChange={form.setSelectedInfrastructures}
                numberOfLots={form.lots.length}
              />
            )}
            {form.currentStep === 'documents' && (
              <StepDocuments
                documents={form.documents}
                onChange={form.setDocuments}
                userId={user?.id}
                requesterType={form.requester?.type}
              />
            )}
            {form.currentStep === 'summary' && (
              <StepSummary
                parentParcel={form.parentParcel}
                requester={form.requester}
                lots={form.lots}
                roads={form.roads}
                validation={form.validation}
                zoningCompliance={form.zoningCompliance}
                purpose={form.purpose}
                submitted={form.submitted}
                referenceNumber={form.referenceNumber}
                submitting={form.submitting}
                submissionFee={form.submissionFee}
                feeBreakdown={form.feeBreakdown}
                onSubmit={handleSubmit}
              />
            )}
          </div>
          
          {/* Navigation footer */}
          {!form.submitted && (
            <div className="border-t px-4 py-3 bg-background shrink-0 space-y-2">
              {/* Dots de progression — au-dessus sur mobile */}
              <div className="flex items-center justify-center gap-1.5">
                {STEP_CONFIG.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStepIndex ? 'w-6 bg-primary' : i < currentStepIndex ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border'
                    }`}
                  />
                ))}
              </div>

              {/* Hint missing fields */}
              {currentStepIndex < STEP_CONFIG.length - 1 && missingFields.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center px-2">
                  Renseignez : {missingFields.join(', ')}
                </p>
              )}

              {/* Boutons */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={form.goPrev}
                  disabled={currentStepIndex === 0}
                  className="gap-1 flex-shrink-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Précédent</span>
                </Button>

                {currentStepIndex < STEP_CONFIG.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={form.goNext}
                    disabled={!form.isStepValid(form.currentStep)}
                    className="gap-1 flex-1 sm:flex-none"
                  >
                    Suivant
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={form.submitting || !form.isStepValid('designer') || !form.isStepValid('documents') || form.loadingFee || form.zoningCompliance.hasErrors}
                    className="gap-1 flex-1 sm:flex-none"
                  >
                    {form.submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    <span className="truncate">Payer & soumettre ({feeLabel})</span>
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <WhatsAppFloatingButton message={`Bonjour, j'ai besoin d'aide pour ma demande de lotissement (parcelle ${parcelNumber}).`} />
        </DialogContent>
      </Dialog>
      
      {/* Close confirmation */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent className="z-[100000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              Votre brouillon sera sauvegardé automatiquement. Vous pourrez le retrouver en réouvrant cette demande.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer l'édition</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCloseConfirm(false); onOpenChange(false); }}>
              Fermer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SubdivisionRequestDialog;
