import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Receipt, Calculator, Plus, DollarSign, Building2, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import FormIntroDialog, { FORM_INTRO_CONFIGS } from './FormIntroDialog';
import TaxFormDialog from './TaxFormDialog';
import PropertyTaxCalculator from './PropertyTaxCalculator';
import BuildingTaxCalculator from './BuildingTaxCalculator';
import IRLCalculator from './IRLCalculator';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import TaxBuildingTargetSelector from './tax-calculator/TaxBuildingTargetSelector';
import { buildKnownBuildings } from './tax-calculator/taxBuildings';
import { useSharedTaxpayer } from './tax-calculator/useSharedTaxpayer';

interface TaxManagementDialogProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenServiceCatalog?: () => void;
}

type RootTab = 'declare' | 'add';
type DeclareSubTab = 'foncier' | 'batisse' | 'irl';

const TaxManagementDialog: React.FC<TaxManagementDialogProps> = ({
  parcelNumber, parcelId, parcelData, open, onOpenChange, onOpenServiceCatalog
}) => {
  const isMobile = useIsMobile();
  const [showIntro, setShowIntro] = useState(true);
  const [rootTab, setRootTab] = useState<RootTab>('declare');
  const [declareSubTab, setDeclareSubTab] = useState<DeclareSubTab>('foncier');

  // Multi-construction selector (CCC alignment)
  const buildings = useMemo(() => buildKnownBuildings(parcelData), [parcelData]);
  const hasMultipleBuildings = buildings.length > 1;
  const [selectedBuildingRef, setSelectedBuildingRef] = useState<string>(
    buildings[0]?.ref || 'main',
  );
  const selectedBuilding = useMemo(
    () => buildings.find(b => b.ref === selectedBuildingRef) ?? null,
    [buildings, selectedBuildingRef],
  );

  // Shared taxpayer state across the four sub-flows
  const taxpayer = useSharedTaxpayer(parcelData?.current_owner_name);

  useEffect(() => {
    if (open) {
      setShowIntro(true);
      setRootTab('declare');
      setDeclareSubTab('foncier');
      setSelectedBuildingRef(buildings[0]?.ref || 'main');
      taxpayer.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (showIntro && open) {
    return (
      <FormIntroDialog
        open={open}
        onOpenChange={onOpenChange}
        onContinue={() => setShowIntro(false)}
        config={{
          ...FORM_INTRO_CONFIGS.tax,
          title: 'Déclaration d\'impôts',
          aboutService: 'Ce service centralise toutes vos obligations fiscales foncières en RDC : l\'Impôt Foncier Annuel (perçu par la DGI), la Taxe de Bâtisse (impôt provincial sur les constructions), l\'Impôt sur le Revenu Locatif (perçu par la DGR), et l\'enregistrement manuel de paiements antérieurs. Chaque déclaration génère une fiche officielle transmise à l\'entité compétente.',
          requiredInfo: [
            'Numéro d\'Identification Fiscale (NIF)',
            'Caractéristiques de la parcelle (zone, usage, superficie)',
            'Détails de la construction (type, état, étages) pour la taxe de bâtisse',
            'Revenus locatifs (pour l\'IRL)',
            'Année fiscale concernée',
          ],
          buttonLabel: 'Accéder au service',
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw]' : 'max-w-md'} rounded-2xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden`}>
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-purple-600" />
            Déclaration d'impôts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Parcelle: {parcelNumber}
          </DialogDescription>

          {/* Niveau 1 : Onglets racine */}
          <div className="flex gap-1.5 mt-3">
            <Button
              variant={rootTab === 'declare' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRootTab('declare')}
              className={`flex-1 h-9 rounded-xl text-xs gap-1.5 ${rootTab === 'declare' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Déclarer un impôt</span>
            </Button>
            <Button
              variant={rootTab === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRootTab('add')}
              className={`flex-1 h-9 rounded-xl text-xs gap-1.5 ${rootTab === 'add' ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Ajouter un paiement</span>
            </Button>
          </div>

          {/* Niveau 2 : Sous-onglets de déclaration */}
          {rootTab === 'declare' && (
            <div className="flex gap-1 mt-2">
              <Button
                variant={declareSubTab === 'foncier' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDeclareSubTab('foncier')}
                className={`flex-1 h-8 rounded-xl text-[11px] gap-1 px-2 ${declareSubTab === 'foncier' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Calculator className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Foncier</span>
              </Button>
              <Button
                variant={declareSubTab === 'batisse' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDeclareSubTab('batisse')}
                className={`flex-1 h-8 rounded-xl text-[11px] gap-1 px-2 ${declareSubTab === 'batisse' ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
              >
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Bâtisse</span>
              </Button>
              <Button
                variant={declareSubTab === 'irl' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDeclareSubTab('irl')}
                className={`flex-1 h-8 rounded-xl text-[11px] gap-1 px-2 ${declareSubTab === 'irl' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <DollarSign className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Locatif</span>
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(85vh - 220px)' }}>
          {/* Building target selector — shown when parcel has >1 building */}
          {hasMultipleBuildings && (
            <div className="px-4 pt-3">
              <TaxBuildingTargetSelector
                buildings={buildings}
                selectedRef={selectedBuildingRef}
                onSelect={setSelectedBuildingRef}
                allowNew={false}
              />
            </div>
          )}

          {rootTab === 'declare' && declareSubTab === 'foncier' && (
            <PropertyTaxCalculator
              key={`foncier-${selectedBuildingRef}`}
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              parcelData={parcelData}
              onOpenServiceCatalog={onOpenServiceCatalog}
              constructionRef={selectedBuildingRef}
              targetBuilding={selectedBuilding}
              taxpayer={taxpayer}
            />
          )}
          {rootTab === 'declare' && declareSubTab === 'batisse' && (
            <BuildingTaxCalculator
              key={`batisse-${selectedBuildingRef}`}
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              parcelData={parcelData}
              onOpenServiceCatalog={onOpenServiceCatalog}
              constructionRef={selectedBuildingRef}
              targetBuilding={selectedBuilding}
              taxpayer={taxpayer}
            />
          )}
          {rootTab === 'declare' && declareSubTab === 'irl' && (
            <IRLCalculator
              key={`irl-${selectedBuildingRef}`}
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              parcelData={parcelData}
              onOpenServiceCatalog={onOpenServiceCatalog}
              constructionRef={selectedBuildingRef}
              targetBuilding={selectedBuilding}
              taxpayer={taxpayer}
            />
          )}
          {rootTab === 'add' && (
            <TaxFormDialog
              key={`add-${selectedBuildingRef}`}
              parcelNumber={parcelNumber}
              parcelId={parcelId}
              open={true}
              onOpenChange={onOpenChange}
              embedded
              constructionRef={selectedBuildingRef}
              taxpayer={taxpayer}
            />
          )}
        </div>
      </DialogContent>
      {open && <WhatsAppFloatingButton message="Bonjour, j'ai besoin d'aide avec la déclaration d'impôts." />}
    </Dialog>
  );
};

export default TaxManagementDialog;
