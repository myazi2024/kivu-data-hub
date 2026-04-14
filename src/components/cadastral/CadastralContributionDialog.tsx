import React, { useRef } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCCCFormState } from '@/hooks/useCCCFormState';
import LocationTab from './ccc-tabs/LocationTab';
import GeneralTab from './ccc-tabs/GeneralTab';
import HistoryTab from './ccc-tabs/HistoryTab';
import ObligationsTab from './ccc-tabs/ObligationsTab';
import ReviewTab from './ccc-tabs/ReviewTab';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import { QuickAuthDialog } from './QuickAuthDialog';

interface CadastralContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  editingContributionId?: string;
}

const CadastralContributionDialog: React.FC<CadastralContributionDialogProps> = ({
  open, onOpenChange, parcelNumber, editingContributionId
}) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const state = useCCCFormState({
    open, onOpenChange, parcelNumber, editingContributionId, dialogContentRef
  });

  // ─── Success screen ───
  if (state.showSuccess) {
    return (
      <Dialog open={open} onOpenChange={state.handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[10000] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className={cn("fixed left-[50%] top-[50%] z-[10000] grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl sm:max-w-md")}>
            <div className="flex flex-col items-center justify-center py-4 sm:py-8 space-y-4 sm:space-y-6 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <CheckCircle2 className="h-16 w-16 sm:h-20 sm:w-20 text-primary relative animate-scale-in" />
              </div>
              <DialogPrimitive.Title className="text-xl sm:text-2xl text-center font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Merci pour votre contribution !
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-center text-sm sm:text-base px-2">
                Votre contribution pour la parcelle <strong className="text-foreground">{parcelNumber}</strong> a été enregistrée.
                Elle sera vérifiée par notre équipe.
              </DialogPrimitive.Description>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 rounded-xl w-full border border-primary/20 shadow-lg backdrop-blur-sm animate-scale-in">
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-center text-foreground mb-2">Contribution en cours de validation</p>
                <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">Notre équipe examine actuellement vos informations pour garantir leur exactitude.</p>
                <div className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /><span>Votre code CCC sera généré après approbation</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /><span>Délai de validation : 24 à 48 heures</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" /><span>Vous serez notifié par email</span></div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-center text-muted-foreground max-w-sm px-2">Consultez l'onglet "Codes CCC" de votre tableau de bord pour suivre l'état de votre contribution.</p>
              <Button onClick={state.handleClose} className="w-full shadow-lg hover:shadow-xl transition-all">Fermer</Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    );
  }

  // ─── Main form ───
  return (
    <>
      <Dialog open={open} onOpenChange={state.handleAttemptClose}>
        <DialogContent
          ref={dialogContentRef}
          className="sm:max-w-xl w-[calc(100%-1rem)] max-w-[380px] sm:max-w-xl max-h-[92vh] overflow-y-auto border-0 shadow-2xl p-0 rounded-2xl z-[9999]"
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-whatsapp-button="true"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1.5 sm:pb-2 border-b bg-gradient-to-r from-primary/5 to-transparent rounded-t-2xl">
            <DialogTitle className="text-sm sm:text-base font-semibold leading-tight flex items-center gap-2 justify-center sm:justify-start">
              <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-lg">{parcelNumber}</Badge>
              <span className="text-xs sm:text-sm text-muted-foreground">Contribution CCC</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={state.activeTab} className="w-full" onValueChange={state.handleTabChange}>
            <div className="sticky top-0 z-20 bg-background px-2 sm:px-4 pt-2 pb-1.5 border-b shadow-sm">
              <TabsList className="grid w-full grid-cols-5 h-10 bg-muted/50 p-0.5 rounded-xl shadow-inner gap-0.5">
                <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg">Infos</TabsTrigger>
                <TabsTrigger value="location" disabled={!state.isTabAccessible('location')} className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Localisation</TabsTrigger>
                <TabsTrigger value="history" disabled={!state.isTabAccessible('history')} className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Passé</TabsTrigger>
                <TabsTrigger value="obligations" disabled={!state.isTabAccessible('obligations')} className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Obligations</TabsTrigger>
                <TabsTrigger value="review" disabled={!state.isTabAccessible('review')} className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all text-sm font-semibold py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">Envoi</TabsTrigger>
              </TabsList>
            </div>

            <div className="px-3 sm:px-6 pb-4 sm:pb-6">
              <TabsContent value="general" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <GeneralTab
                  formData={state.formData} handleInputChange={state.handleInputChange}
                  customTitleName={state.customTitleName} setCustomTitleName={state.setCustomTitleName}
                  leaseYears={state.leaseYears} setLeaseYears={state.setLeaseYears}
                  titleDocFiles={state.titleDocFiles} handleFileChange={state.handleFileChange} removeFile={state.removeFile}
                  currentOwners={state.currentOwners} setCurrentOwners={state.setCurrentOwners}
                  ownershipMode={state.ownershipMode} setOwnershipMode={state.setOwnershipMode}
                  ownerDocFile={state.ownerDocFile} updateCurrentOwner={state.updateCurrentOwner}
                  addCurrentOwner={state.addCurrentOwner} removeCurrentOwner={state.removeCurrentOwner}
                  showOwnerWarning={state.showOwnerWarning} highlightIncompleteOwner={state.highlightIncompleteOwner}
                  PROPERTY_CATEGORY_OPTIONS={state.PROPERTY_CATEGORY_OPTIONS}
                  availableConstructionTypes={state.availableConstructionTypes} availableConstructionNatures={state.availableConstructionNatures}
                  availableConstructionMaterials={state.availableConstructionMaterials} availableDeclaredUsages={state.availableDeclaredUsages}
                  availableStandings={state.availableStandings}
                  constructionMode={state.constructionMode} setConstructionMode={state.setConstructionMode}
                  additionalConstructions={state.additionalConstructions} setAdditionalConstructions={state.setAdditionalConstructions}
                  permitMode={state.permitMode} setPermitMode={state.setPermitMode}
                  buildingPermits={state.buildingPermits} updateBuildingPermit={state.updateBuildingPermit}
                  updateBuildingPermitFile={state.updateBuildingPermitFile} removeBuildingPermitFile={state.removeBuildingPermitFile}
                  getPermitTypeRestrictions={state.getPermitTypeRestrictions}
                  showPermitWarning={state.showPermitWarning} highlightIncompletePermit={state.highlightIncompletePermit}
                  highlightRequiredFields={state.highlightRequiredFields} setHighlightRequiredFields={state.setHighlightRequiredFields}
                  getPicklistOptions={state.getPicklistOptions} getPicklistDependentOptions={state.getPicklistDependentOptions}
                  handleNextTab={state.handleNextTab} toast={state.toast}
                  resetTitleBlock={state.resetTitleBlock} resetOwnersBlock={state.resetOwnersBlock} resetConstructionBlock={state.resetConstructionBlock}
                />
              </TabsContent>

              <TabsContent value="location" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <LocationTab
                  formData={state.formData} handleInputChange={state.handleInputChange}
                  sectionType={state.sectionType} sectionTypeAutoDetected={state.sectionTypeAutoDetected}
                  handleSectionTypeChange={state.handleSectionTypeChange}
                  availableVilles={state.availableVilles} availableCommunes={state.availableCommunes}
                  availableTerritoires={state.availableTerritoires} availableCollectivites={state.availableCollectivites}
                  availableQuartiers={state.availableQuartiers} availableAvenues={state.availableAvenues}
                  gpsCoordinates={state.gpsCoordinates} onCoordinatesUpdate={state.setGpsCoordinates}
                  mapConfig={state.mapConfig} parcelNumber={parcelNumber}
                  roadSides={state.roadSides} onRoadSidesChange={state.setRoadSides}
                  parcelSides={state.parcelSides} onParcelSidesUpdate={state.setParcelSides}
                  servitude={state.servitude} onServitudeChange={state.setServitude}
                  buildingShapes={state.buildingShapes} onBuildingShapesChange={state.setBuildingShapes}
                  soundEnvironment={state.soundEnvironment} onSoundEnvironmentChange={state.setSoundEnvironment}
                  nearbySoundSources={state.nearbySoundSources} onNearbySoundSourcesChange={state.setNearbySoundSources}
                  constructionMode={state.constructionMode} additionalConstructions={state.additionalConstructions}
                  handleTabChange={state.handleTabChange} handleNextTab={state.handleNextTab}
                  resetLocationBlock={state.resetLocationBlock}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <HistoryTab
                  formData={state.formData} currentOwners={state.currentOwners} previousOwners={state.previousOwners}
                  updatePreviousOwner={state.updatePreviousOwner} addPreviousOwner={state.addPreviousOwner}
                  removePreviousOwner={state.removePreviousOwner}
                  highlightIncompletePreviousOwner={state.highlightIncompletePreviousOwner}
                  showCurrentOwnerRequiredWarning={state.showCurrentOwnerRequiredWarning}
                  showPreviousOwnerWarning={state.showPreviousOwnerWarning}
                  getPicklistOptions={state.getPicklistOptions}
                  handleTabChange={state.handleTabChange} handleNextTab={state.handleNextTab} toast={state.toast}
                  resetPreviousOwnersBlock={state.resetPreviousOwnersBlock}
                />
              </TabsContent>

              <TabsContent value="obligations" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <ObligationsTab
                  parcelNumber={parcelNumber}
                  formData={state.formData} obligationType={state.obligationType} setObligationType={state.setObligationType}
                  taxRecords={state.taxRecords} updateTaxRecord={state.updateTaxRecord} addTaxRecord={state.addTaxRecord}
                  removeTaxRecord={state.removeTaxRecord} handleTaxFileChange={state.handleTaxFileChange} removeTaxFile={state.removeTaxFile}
                  showTaxWarning={state.showTaxWarning} highlightIncompleteTax={state.highlightIncompleteTax}
                  hasMortgage={state.hasMortgage} setHasMortgage={state.setHasMortgage}
                  mortgageRecords={state.mortgageRecords} setMortgageRecords={state.setMortgageRecords}
                  updateMortgageRecord={state.updateMortgageRecord} addMortgageRecord={state.addMortgageRecord}
                  removeMortgageRecord={state.removeMortgageRecord} handleMortgageFileChange={state.handleMortgageFileChange}
                  removeMortgageFile={state.removeMortgageFile}
                   showMortgageWarning={state.showMortgageWarning} highlightIncompleteMortgage={state.highlightIncompleteMortgage}
                   hasDispute={state.hasDispute} setHasDispute={state.setHasDispute}
                  onDisputeDataChange={state.setDisputeFormData}
                  getPicklistOptions={state.getPicklistOptions}
                  handleTabChange={state.handleTabChange} handleNextTab={state.handleNextTab}
                  resetTaxBlock={state.resetTaxBlock} resetMortgageBlock={state.resetMortgageBlock}
                />
              </TabsContent>

              <TabsContent value="review" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <ReviewTab
                  formData={state.formData} sectionType={state.sectionType}
                  currentOwners={state.currentOwners} previousOwners={state.previousOwners}
                  taxRecords={state.taxRecords} mortgageRecords={state.mortgageRecords} hasMortgage={state.hasMortgage}
                  hasDispute={state.hasDispute}
                  buildingPermits={state.buildingPermits} permitMode={state.permitMode}
                  constructionMode={state.constructionMode} additionalConstructions={state.additionalConstructions}
                  ownerDocFile={state.ownerDocFile} titleDocFiles={state.titleDocFiles}
                  gpsCoordinates={state.gpsCoordinates} parcelSides={state.parcelSides}
                  leaseYears={state.leaseYears} customTitleName={state.customTitleName}
                   roadSides={state.roadSides} servitude={state.servitude}
                   buildingShapes={state.buildingShapes} disputeFormData={state.disputeFormData}
                   mapConfig={state.mapConfig}
                  soundEnvironment={state.soundEnvironment} nearbySoundSources={state.nearbySoundSources}
                  calculateCCCValue={state.calculateCCCValue} isFormValidForSubmission={state.isFormValidForSubmission}
                  getMissingFields={state.getMissingFields} handleSubmit={state.handleSubmit}
                  handleTabChange={state.handleTabChange} saveFormDataToStorage={state.saveFormDataToStorage}
                  setShowQuickAuth={state.setShowQuickAuth} setPendingSubmission={state.setPendingSubmission}
                  loading={state.loading} uploading={state.uploading} user={state.user}
                />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <QuickAuthDialog
        open={state.showQuickAuth}
        onOpenChange={state.setShowQuickAuth}
        onAuthSuccess={async () => {
          if (state.pendingSubmission) {
            setTimeout(async () => { await state.handleSubmit(); state.setPendingSubmission(false); }, 1000);
          }
        }}
      />

      {open && <WhatsAppFloatingButton />}

      <AlertDialog open={state.showExitConfirmation} onOpenChange={state.setShowExitConfirmation}>
        <AlertDialogContent className="z-[100000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>Vous avez des données non soumises. Vos données ont été sauvegardées en brouillon et seront restaurées à votre prochaine visite.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer l'édition</AlertDialogCancel>
            <AlertDialogAction onClick={state.handleClose}>Fermer quand même</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CadastralContributionDialog;
