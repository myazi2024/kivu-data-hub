import React, { useState } from 'react';
import { Building, MapPin, Clock, Receipt, Scale, User } from 'lucide-react';
import { EMPTY_ACCESS, hasAnyOpenSection, isSectionOpen, sectionNumber, type CadastralSectionKey } from '@/lib/cadastralResultAccess';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { createDocumentVerification } from '@/lib/documentVerification';

import DocumentToolbar from './DocumentToolbar';
import DocumentHeader from './DocumentHeader';
import { usePrintScope } from '@/hooks/usePrintScope';
import DocumentFooter from './DocumentFooter';
import { SectionCard, LockedSection } from './primitives';

import IdentificationSection from './sections/IdentificationSection';
import OwnerSection from './sections/OwnerSection';
import ConstructionSection from './sections/ConstructionSection';
import LocationSection from './sections/LocationSection';
import HistorySection from './sections/HistorySection';
import ObligationsSection from './sections/ObligationsSection';
import DisputesSection from './sections/DisputesSection';


interface CadastralDocumentViewProps {
  result: CadastralSearchResult;
  onDownloadReport: () => void;
  onBackToCatalog: () => void;
}

const CadastralDocumentView: React.FC<CadastralDocumentViewProps> = ({
  result, onDownloadReport, onBackToCatalog,
}) => {
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits, land_disputes } = result;
  const access = result.access ?? EMPTY_ACCESS;

  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const { printRef, print } = usePrintScope<HTMLDivElement>();

  // Rubriques ouvertes : uniquement selon les accès confirmés par le serveur.
  const open = (k: CadastralSectionKey) => isSectionOpen(access, k);
  const canCertify = hasAnyOpenSection(access);
  const hasConstructionData = !!(parcel.construction_type || parcel.construction_nature || parcel.construction_materials || parcel.construction_year) || building_permits.length > 0;

  // Code de vérification créé uniquement à l'impression d'un document contenant un service acheté.
  const handlePrint = async () => {
    if (canCertify && !verificationCode) {
      const v = await createDocumentVerification({ documentType: 'report', parcelNumber: parcel.parcel_number });
      if (v) {
        setVerificationCode(v.verificationCode);
        setVerifyUrl(v.verifyUrl);
        // Laisse le QR code se dessiner avant l'impression.
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    print();
  };

  const locked = (k: CadastralSectionKey, icon: React.ReactNode, title: string, serviceName: string) => (
    <SectionCard number={sectionNumber(k)} icon={icon} title={title}>
      <LockedSection serviceName={serviceName} onUnlock={onBackToCatalog} />
    </SectionCard>
  );

  return (
    <div ref={printRef} className="cadastral-document">
      <DocumentToolbar onBackToCatalog={onBackToCatalog} onDownloadReport={onDownloadReport} onPrint={handlePrint} />

      <div className="bg-background rounded-xl shadow-lg border border-border/50 print:shadow-none print:border-0 print:rounded-none overflow-hidden">
        <DocumentHeader parcel={parcel} />

        <div className="px-6 sm:px-10 py-6 space-y-5">

          {open('identification') ? (
            <>
              <IdentificationSection number={sectionNumber('identification')} parcel={parcel} />
              <OwnerSection number={sectionNumber('owner')} parcel={parcel} />
              {hasConstructionData ? (
                <ConstructionSection number={sectionNumber('construction')} parcel={parcel} buildingPermits={building_permits} />
              ) : (
                <SectionCard number={sectionNumber('construction')} icon={<Building className="h-4 w-4" />} title="Construction & autorisations">
                  <p className="text-sm text-muted-foreground">Aucune construction déclarée pour cette parcelle.</p>
                </SectionCard>
              )}
            </>
          ) : (
            <>
              {locked('identification', <Building className="h-4 w-4" />, 'Identification', 'Informations générales')}
              {locked('owner', <User className="h-4 w-4" />, 'Propriétaire actuel', 'Informations générales')}
              {locked('construction', <Building className="h-4 w-4" />, 'Construction & autorisations', 'Informations générales')}
            </>
          )}

          {open('location')
            ? <LocationSection number={sectionNumber('location')} parcel={parcel} boundaryHistory={boundary_history} />
            : locked('location', <MapPin className="h-4 w-4" />, 'Localisation & Bornage', 'Localisation & historique de bornage')}

          {open('history')
            ? <HistorySection number={sectionNumber('history')} parcel={parcel} ownershipHistory={ownership_history} />
            : locked('history', <Clock className="h-4 w-4" />, 'Historique de propriété', 'Historique des propriétaires')}

          {open('obligations')
            ? <ObligationsSection number={sectionNumber('obligations')} taxHistory={tax_history} mortgageHistory={mortgage_history} />
            : locked('obligations', <Receipt className="h-4 w-4" />, 'Obligations financières', 'Obligations fiscales et hypothécaires')}

          {open('disputes')
            ? <DisputesSection number={sectionNumber('disputes')} landDisputes={land_disputes} />
            : locked('disputes', <Scale className="h-4 w-4" />, 'Litiges fonciers', 'Litiges fonciers')}

        </div>

        <DocumentFooter parcelNumber={parcel.parcel_number} verificationCode={verificationCode} verifyUrl={verifyUrl} />
      </div>
    </div>
  );
};

export default CadastralDocumentView;
