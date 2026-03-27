import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Grid3X3, MapPin, Pencil, Eye, FileText, ChevronLeft, ChevronRight, Check, Loader2, Info, Trash2 } from 'lucide-react';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { useSubdivisionForm } from './subdivision/hooks/useSubdivisionForm';
import { SubdivisionStep } from './subdivision/types';
import StepParentParcel from './subdivision/steps/StepParentParcel';
import StepLotDesigner from './subdivision/steps/StepLotDesigner';
import StepPlanView from './subdivision/steps/StepPlanView';
import StepSummary from './subdivision/steps/StepSummary';

interface SubdivisionRequestDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_CONFIG: { key: SubdivisionStep; label: string; icon: React.ReactNode; shortLabel: string }[] = [
  { key: 'parcel', label: 'Parcelle & Demandeur', icon: <MapPin className="h-3.5 w-3.5" />, shortLabel: 'Parcelle' },
  { key: 'designer', label: 'Conception des lots', icon: <Pencil className="h-3.5 w-3.5" />, shortLabel: 'Lots' },
  { key: 'plan', label: 'Plan personnalisé', icon: <Eye className="h-3.5 w-3.5" />, shortLabel: 'Plan' },
  { key: 'summary', label: 'Récapitulatif', icon: <FileText className="h-3.5 w-3.5" />, shortLabel: 'Envoi' },
];

const SubdivisionRequestDialog: React.FC<SubdivisionRequestDialogProps> = ({
  parcelNumber, parcelId, parcelData, open, onOpenChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  const form = useSubdivisionForm(parcelNumber, parcelData, user);
  
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
      const ref = await form.submit(user.id);
      if (ref) {
        toast({ title: 'Demande soumise !', description: `Référence: ${ref}` });
      }
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
  
  const currentStepIndex = form.steps.indexOf(form.currentStep);
  const feeLabel = form.loadingFee ? '...' : `${form.submissionFee ?? 20}$`;
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[92vh] p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-4 pt-4 pb-2">
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
            <div className="px-4">
              <Alert className="py-2 border-amber-500/30 bg-amber-50/50">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs flex items-center justify-between">
                  <span>Brouillon restauré automatiquement.</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={form.clearDraft}>
                    <Trash2 className="h-3 w-3" /> Effacer
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {/* Step navigation */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-2">
            <div className="flex items-center gap-1">
              {STEP_CONFIG.map((step, index) => {
                const isActive = step.key === form.currentStep;
                const isDone = index < currentStepIndex;
                const isClickable = index <= currentStepIndex || form.isStepValid(STEP_CONFIG[Math.max(0, index - 1)].key);
                
                return (
                  <React.Fragment key={step.key}>
                    {index > 0 && (
                      <div className={`flex-shrink-0 w-4 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />
                    )}
                    <button
                      onClick={() => isClickable && form.setCurrentStep(step.key)}
                      disabled={!isClickable}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0
                        ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : ''}
                        ${isDone ? 'text-primary hover:bg-primary/10' : ''}
                        ${!isActive && !isDone ? 'text-muted-foreground' : ''}
                        ${!isClickable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {isDone ? <Check className="h-3 w-3" /> : step.icon}
                      <span className="hidden sm:inline">{step.shortLabel}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(92vh - 180px)' }}>
            {form.currentStep === 'parcel' && (
              <StepParentParcel
                parentParcel={form.parentParcel}
                loadingParcel={form.loadingParcel}
                requester={form.requester}
                onRequesterChange={form.setRequester}
                purpose={form.purpose}
                onPurposeChange={form.setPurpose}
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
                onCreateInitialLot={form.handleAutoSubdivide}
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
            {form.currentStep === 'summary' && (
              <StepSummary
                parentParcel={form.parentParcel}
                requester={form.requester}
                lots={form.lots}
                roads={form.roads}
                validation={form.validation}
                purpose={form.purpose}
                submitted={form.submitted}
                referenceNumber={form.referenceNumber}
                submitting={form.submitting}
                submissionFee={form.submissionFee}
                onSubmit={handleSubmit}
              />
            )}
          </div>
          
          {/* Navigation footer */}
          {!form.submitted && (
            <div className="border-t px-4 py-3 flex items-center justify-between gap-2 bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={form.goPrev}
                disabled={currentStepIndex === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Précédent
              </Button>
              
              <div className="flex items-center gap-1.5">
                {STEP_CONFIG.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStepIndex ? 'w-6 bg-primary' : i < currentStepIndex ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border'
                    }`}
                  />
                ))}
              </div>
              
              {currentStepIndex < STEP_CONFIG.length - 1 ? (
                <Button
                  size="sm"
                  onClick={form.goNext}
                  disabled={!form.isStepValid(form.currentStep)}
                  className="gap-1"
                >
                  Suivant
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={form.submitting || !form.isStepValid('designer') || form.loadingFee}
                  className="gap-1"
                >
                  {form.submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Soumettre ({feeLabel})
                </Button>
              )}
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
