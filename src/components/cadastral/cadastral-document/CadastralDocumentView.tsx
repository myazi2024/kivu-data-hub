import React, { useState, useEffect } from 'react';
import { Building, MapPin, Clock, Receipt, Scale } from 'lucide-react';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { CadastralService } from '@/hooks/useCadastralServices';
import { createDocumentVerification } from '@/lib/documentVerification';

import DocumentToolbar from './DocumentToolbar';
import DocumentHeader from './DocumentHeader';
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
  paidServices: string[];
  catalogServices: CadastralService[];
  onDownloadReport: () => void;
  onBackToCatalog: () => void;
}

type SectionKey = 'identification' | 'owner' | 'construction' | 'location' | 'history' | 'obligations' | 'disputes';

const CadastralDocumentView: React.FC<CadastralDocumentViewProps> = ({
  result, paidServices, catalogServices, onDownloadReport, onBackToCatalog,
}) => {
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits, land_disputes } = result;

  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createDocumentVerification({
      documentType: 'report',
      parcelNumber: parcel.parcel_number,
    }).then((result) => {
      if (!cancelled && result) {
        setVerificationCode(result.verificationCode);
        setVerifyUrl(result.verifyUrl);
      }
    });
    return () => { cancelled = true; };
  }, [parcel.parcel_number]);

  const hasParcelData = !!parcel.current_owner_name;
  const hasConstruction = !!(parcel.construction_type || parcel.construction_nature || parcel.construction_materials || parcel.construction_year) || building_permits.length > 0;
  const hasHistoryData = ownership_history.length > 0;
  const hasObligationsData = tax_history.length > 0 || mortgage_history.length > 0;
  const hasDisputesAccess = paidServices.includes('disputes') || (Array.isArray(land_disputes) && land_disputes.length > 0);
  const hasLocationData = hasParcelData && (!!parcel.province || !!parcel.latitude);

  // Declarative visible sections for numbering
  const visibleSections: SectionKey[] = [
    hasParcelData ? 'identification' : null,
    hasParcelData ? 'owner' : null,
    hasParcelData && hasConstruction ? 'construction' : null,
    hasLocationData ? 'location' : null,
    'history',
    'obligations',
    'disputes',
  ].filter(Boolean) as SectionKey[];

  // If parcel data is missing, collapse identification + owner into one locked section
  if (!hasParcelData) {
    // Remove them from visible, they'll be shown as locked
  }

  const sn = (key: SectionKey) => visibleSections.indexOf(key) + 1;

  return (
    <div className="cadastral-document">
      <DocumentToolbar onBackToCatalog={onBackToCatalog} onDownloadReport={onDownloadReport} />

      <div className="bg-background rounded-xl shadow-lg border border-border/50 print:shadow-none print:border-0 print:rounded-none overflow-hidden">
        <DocumentHeader parcel={parcel} />

        <div className="px-6 sm:px-10 py-6 space-y-5">

          {/* Identification + Owner + Construction */}
          {hasParcelData ? (
            <>
              <IdentificationSection number={sn('identification')} parcel={parcel} />
              <OwnerSection number={sn('owner')} parcel={parcel} />
              {hasConstruction && (
                <ConstructionSection number={sn('construction')} parcel={parcel} buildingPermits={building_permits} />
              )}
            </>
          ) : (
            <SectionCard number={1} icon={<Building className="h-4 w-4" />} title="Identification & Propriétaire">
              <LockedSection serviceName="Informations générales" onUnlock={onBackToCatalog} />
            </SectionCard>
          )}

          {/* Location */}
          {hasLocationData ? (
            <LocationSection number={sn('location')} parcel={parcel} boundaryHistory={boundary_history} />
          ) : (
            <SectionCard number={sn('location') || visibleSections.length + 1} icon={<MapPin className="h-4 w-4" />} title="Localisation & Bornage">
              <LockedSection serviceName="Localisation & historique" onUnlock={onBackToCatalog} />
            </SectionCard>
          )}

          {/* History */}
          {hasHistoryData || (hasParcelData && paidServices.includes('history')) ? (
            <HistorySection number={sn('history')} parcel={parcel} ownershipHistory={ownership_history} />
          ) : (
            <SectionCard number={sn('history')} icon={<Clock className="h-4 w-4" />} title="Historique de propriété">
              <LockedSection serviceName="Historique des propriétaires" onUnlock={onBackToCatalog} />
            </SectionCard>
          )}

          {/* Obligations */}
          {hasObligationsData || paidServices.includes('obligations') ? (
            <ObligationsSection number={sn('obligations')} taxHistory={tax_history} mortgageHistory={mortgage_history} />
          ) : (
            <SectionCard number={sn('obligations')} icon={<Receipt className="h-4 w-4" />} title="Obligations financières">
              <LockedSection serviceName="Obligations fiscales et hypothécaires" onUnlock={onBackToCatalog} />
            </SectionCard>
          )}

          {/* Disputes */}
          {hasDisputesAccess ? (
            <DisputesSection number={sn('disputes')} landDisputes={land_disputes} />
          ) : (
            <SectionCard number={sn('disputes')} icon={<Scale className="h-4 w-4" />} title="Litiges fonciers">
              <LockedSection serviceName="Litiges fonciers" onUnlock={onBackToCatalog} />
            </SectionCard>
          )}

        </div>

        <DocumentFooter parcelNumber={parcel.parcel_number} verificationCode={verificationCode} verifyUrl={verifyUrl} />
      </div>
    </div>
  );
};

export default CadastralDocumentView;
