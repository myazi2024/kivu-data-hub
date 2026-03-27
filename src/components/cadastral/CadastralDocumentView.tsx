import React from 'react';
import { 
  Download, Printer, ShoppingCart, FileText, User, MapPin, Clock, 
  Receipt, CreditCard, Building, Map, CheckCircle, CheckCircle2, 
  XCircle, AlertCircle, Landmark, Hash, ExternalLink, Info, Scale,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CadastralSearchResult } from '@/hooks/useCadastralSearch';
import { CadastralService } from '@/hooks/useCadastralServices';
import CadastralMap from './CadastralMap';
import DocumentAttachment from './DocumentAttachment';
import VerificationButton from './VerificationButton';
import { PROPERTY_TITLE_TYPES } from './PropertyTitleTypeSelect';

interface CadastralDocumentViewProps {
  result: CadastralSearchResult;
  paidServices: string[];
  catalogServices: CadastralService[];
  onDownloadReport: () => void;
  onBackToCatalog: () => void;
}

/** Ligne label/valeur pour les tableaux 2 colonnes */
const DataRow: React.FC<{ label: string; value: React.ReactNode; highlight?: boolean }> = ({ label, value, highlight }) => (
  <tr>
    <td className="text-muted-foreground font-medium whitespace-nowrap pr-4">{label}</td>
    <td className={highlight ? 'font-semibold text-primary' : ''}>{value || '—'}</td>
  </tr>
);

const SectionTitle: React.FC<{ number: number; icon: React.ReactNode; title: string }> = ({ number, icon, title }) => (
  <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">{number}</div>
    <div className="flex items-center gap-2 text-primary">
      {icon}
      <h3 className="text-base font-bold uppercase tracking-wide">{title}</h3>
    </div>
    <Separator className="flex-1 ml-2" />
  </div>
);

const LockedPlaceholder: React.FC<{ serviceName: string }> = ({ serviceName }) => (
  <div className="py-4 px-6 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20 text-center">
    <p className="text-sm text-muted-foreground italic">🔒 Section « {serviceName} » non incluse dans votre achat</p>
  </div>
);

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatArea = (sqm: number) => {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha (${sqm.toLocaleString()} m²)`;
  return `${sqm.toLocaleString()} m²`;
};

const CadastralDocumentView: React.FC<CadastralDocumentViewProps> = ({
  result, paidServices, catalogServices, onDownloadReport, onBackToCatalog,
}) => {
  const { parcel, ownership_history, tax_history, mortgage_history, boundary_history, building_permits, land_disputes, legal_verification } = result;

  // Data-presence gating: if the server returned data, the user has access
  const hasParcelData = !!parcel.current_owner_name; // full parcel has owner; minimal doesn't
  const hasLocationData = boundary_history.length > 0 || !!parcel.latitude;
  const hasHistoryData = ownership_history.length > 0;
  const hasObligationsData = tax_history.length > 0 || mortgage_history.length > 0;
  const hasDisputesData = land_disputes !== undefined && land_disputes !== null;
  const hasLegalVerification = legal_verification !== null && legal_verification !== undefined;

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'overdue': return 'En retard';
      case 'pending': return 'En attente';
      default: return status;
    }
  };
  const getPaymentStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'paid': return 'default';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  let sectionNumber = 0;

  return (
    <div className="cadastral-document">
      {/* Actions toolbar — hidden in print */}
      <div className="print:hidden flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 border-b border-border/50">
        <Button variant="outline" size="sm" onClick={onBackToCatalog} className="text-xs">
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          Catalogue
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={onDownloadReport} className="text-xs">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Télécharger PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs">
          <Printer className="h-3.5 w-3.5 mr-1.5" />
          Imprimer
        </Button>
      </div>

      {/* Document sheet */}
      <div className="bg-background rounded-xl shadow-lg border border-border/50 print:shadow-none print:border-0 print:rounded-none">
        {/* Header */}
        <div className="px-6 sm:px-10 py-6 border-b-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent print:bg-transparent">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">Bureau de l'Immobilier du Congo</p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground mt-1 tracking-tight">Fiche Cadastrale</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Parcelle N° <span className="font-mono font-bold text-foreground">{parcel.parcel_number}</span>
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0">
              <p>Générée le</p>
              <p className="font-semibold text-foreground">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <Badge variant={parcel.parcel_type === 'SU' ? 'default' : 'secondary'} className="mt-2">
                {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-10 py-6 space-y-2">

          {/* ===================== 1. IDENTIFICATION ===================== */}
          {hasParcelData ? (
            <>
              <SectionTitle number={++sectionNumber} icon={<Building className="h-4 w-4" />} title="Identification de la parcelle" />
              <table className="doc-table">
                <tbody>
                  <DataRow label="Type de titre" value={
                    <span className="flex items-center gap-1.5">
                      {parcel.property_title_type}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="print:hidden"><Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" /></button>
                        </PopoverTrigger>
                        <PopoverContent side="right" className="max-w-sm text-sm">
                          {PROPERTY_TITLE_TYPES.find(t => t.value === parcel.property_title_type)?.details ||
                            "Type de titre de propriété reconnu par la législation foncière de la RDC."}
                        </PopoverContent>
                      </Popover>
                    </span>
                  } />
                  {parcel.title_reference_number && <DataRow label="Référence du titre" value={<span className="font-mono">{parcel.title_reference_number}</span>} />}
                  {parcel.title_issue_date && <DataRow label="Date d'émission" value={formatDate(parcel.title_issue_date)} />}
                  <DataRow label="Superficie" value={formatArea(parcel.area_sqm)} highlight />
                  {parcel.area_hectares && parcel.area_hectares > 0 && <DataRow label="Hectares" value={`${parcel.area_hectares.toFixed(2)} ha`} />}
                  {parcel.declared_usage && <DataRow label="Usage déclaré" value={parcel.declared_usage} />}
                  {parcel.lease_type && <DataRow label="Type de bail" value={parcel.lease_type} />}
                  {parcel.standing && <DataRow label="Standing" value={parcel.standing} />}
                </tbody>
              </table>

              {parcel.property_title_document_url && (
                <div className="mt-3">
                  <DocumentAttachment documentUrl={parcel.property_title_document_url} label="Titre de propriété" description="Document officiel" />
                </div>
              )}

              {/* Propriétaire */}
              <SectionTitle number={++sectionNumber} icon={<User className="h-4 w-4" />} title="Propriétaire actuel" />
              <table className="doc-table">
                <tbody>
                  <DataRow label="Nom complet" value={parcel.current_owner_name} highlight />
                  <DataRow label="Statut juridique" value={parcel.current_owner_legal_status} />
                  <DataRow label="Propriétaire depuis" value={formatDate(parcel.current_owner_since)} />
                  {parcel.whatsapp_number && <DataRow label="WhatsApp" value={
                    <a href={`https://wa.me/${parcel.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary underline print:no-underline">
                      {parcel.whatsapp_number}
                    </a>
                  } />}
                </tbody>
              </table>
              {parcel.owner_document_url && (
                <div className="mt-3">
                  <DocumentAttachment documentUrl={parcel.owner_document_url} label="Document d'identité" description="Justificatif du propriétaire" />
                </div>
              )}

              {/* Construction */}
              {(parcel.construction_type || parcel.construction_nature || parcel.construction_materials || parcel.construction_year) && (
                <>
                  <SectionTitle number={++sectionNumber} icon={<Building className="h-4 w-4" />} title="Construction" />
                  <table className="doc-table">
                    <tbody>
                      {parcel.construction_type && <DataRow label="Type" value={parcel.construction_type} />}
                      {parcel.construction_nature && <DataRow label="Nature" value={parcel.construction_nature} />}
                      {parcel.construction_materials && <DataRow label="Matériaux" value={parcel.construction_materials} />}
                      {parcel.construction_year && <DataRow label="Année" value={parcel.construction_year} />}
                    </tbody>
                  </table>
                </>
              )}

              {/* Building permits */}
              {building_permits.length > 0 && (
                <>
                  <SectionTitle number={++sectionNumber} icon={<FileText className="h-4 w-4" />} title="Autorisations de bâtir" />
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>N° Permis</th>
                        <th>Émission</th>
                        <th>Validité</th>
                        <th>Statut</th>
                        <th>Service émetteur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {building_permits.map((permit) => {
                        const issueDate = new Date(permit.issue_date);
                        const endDate = new Date(issueDate);
                        endDate.setMonth(endDate.getMonth() + permit.validity_period_months);
                        const isValid = endDate > new Date();
                        return (
                          <tr key={permit.id}>
                            <td className="font-mono text-xs">{permit.permit_number}</td>
                            <td>{formatDate(permit.issue_date)}</td>
                            <td className={isValid ? 'text-green-600' : 'text-destructive'}>
                              {isValid ? '✅ Valide' : '❌ Expiré'} — {endDate.toLocaleDateString('fr-FR')}
                            </td>
                            <td>
                              <Badge variant={['Conforme', 'Approuvé', 'Délivré', 'Delivre'].includes(permit.administrative_status) ? 'default' :
                                permit.administrative_status === 'En attente' ? 'secondary' : 'destructive'} className="text-xs">
                                {permit.administrative_status}
                              </Badge>
                            </td>
                            <td className="text-xs">{permit.issuing_service}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : (
            <>
              <SectionTitle number={++sectionNumber} icon={<Building className="h-4 w-4" />} title="Identification & Propriétaire" />
              <LockedPlaceholder serviceName="Informations générales" />
            </>
          )}

          {/* ===================== LOCALISATION ===================== */}
          {(hasParcelData && (!!parcel.province || !!parcel.latitude)) ? (
            <>
              <SectionTitle number={++sectionNumber} icon={<MapPin className="h-4 w-4" />} title="Localisation" />
              <table className="doc-table">
                <tbody>
                  <DataRow label="Province" value={parcel.province} />
                  {parcel.parcel_type === 'SU' ? (
                    <>
                      {parcel.ville && <DataRow label="Ville" value={parcel.ville} />}
                      {parcel.commune && <DataRow label="Commune" value={parcel.commune} />}
                      {parcel.quartier && <DataRow label="Quartier" value={parcel.quartier} />}
                      {parcel.avenue && <DataRow label="Avenue" value={parcel.avenue} />}
                      {parcel.house_number && <DataRow label="N° Maison" value={parcel.house_number} />}
                    </>
                  ) : (
                    <>
                      {parcel.territoire && <DataRow label="Territoire" value={parcel.territoire} />}
                      {parcel.collectivite && <DataRow label="Collectivité" value={parcel.collectivite} />}
                      {parcel.groupement && <DataRow label="Groupement" value={parcel.groupement} />}
                      {parcel.village && <DataRow label="Village" value={parcel.village} />}
                    </>
                  )}
                  {parcel.latitude && parcel.longitude && (
                    <DataRow label="Coordonnées GPS" value={
                      <span className="font-mono text-xs">{parcel.latitude.toFixed(6)}, {parcel.longitude.toFixed(6)}</span>
                    } />
                  )}
                  {parcel.nombre_bornes && <DataRow label="Nombre de bornes" value={parcel.nombre_bornes} />}
                </tbody>
              </table>

              {/* Croquis */}
              <div className="mt-4 print:break-before-page">
                <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <Map className="h-4 w-4" /> Croquis du terrain
                </h4>
                <div className="relative z-0 rounded-lg overflow-hidden border border-border/50">
                  <CadastralMap
                    coordinates={Array.isArray(parcel.gps_coordinates) ? parcel.gps_coordinates as Array<{ lat: number; lng: number; borne: string }> : []}
                    center={{ lat: parcel.latitude, lng: parcel.longitude }}
                    parcelNumber={parcel.parcel_number}
                  />
                </div>
              </div>

              {/* Bornage */}
              {boundary_history.length > 0 && (
                <>
                  <SectionTitle number={++sectionNumber} icon={<MapPin className="h-4 w-4" />} title="Historique de bornage" />
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>Réf. PV</th>
                        <th>Objet</th>
                        <th>Géomètre</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boundary_history.map((b) => (
                        <tr key={b.id}>
                          <td className="font-mono text-xs">{b.pv_reference_number}</td>
                          <td>{b.boundary_purpose}</td>
                          <td>{b.surveyor_name}</td>
                          <td>{formatDate(b.survey_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {boundary_history.filter(b => b.boundary_document_url).map(b => (
                    <div key={b.id} className="mt-2">
                      <DocumentAttachment documentUrl={b.boundary_document_url} label={`PV ${b.pv_reference_number}`} description="Procès-verbal de bornage" />
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <SectionTitle number={++sectionNumber} icon={<MapPin className="h-4 w-4" />} title="Localisation & Bornage" />
              <LockedPlaceholder serviceName="Localisation & historique" />
            </>
          )}

          {/* ===================== HISTORIQUE ===================== */}
          {hasAccess('history') ? (
            <>
              <SectionTitle number={++sectionNumber} icon={<Clock className="h-4 w-4" />} title="Historique de propriété" />
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Propriétaire</th>
                    <th>Statut juridique</th>
                    <th>Du</th>
                    <th>Au</th>
                    <th>Type de mutation</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Current owner */}
                  <tr className="bg-primary/5">
                    <td className="font-semibold">{parcel.current_owner_name}</td>
                    <td>{parcel.current_owner_legal_status}</td>
                    <td>{formatDate(parcel.current_owner_since)}</td>
                    <td><Badge variant="default" className="text-xs">Actuel</Badge></td>
                    <td>—</td>
                  </tr>
                  {ownership_history.map((owner) => (
                    <tr key={owner.id}>
                      <td>{owner.owner_name}</td>
                      <td>{owner.legal_status}</td>
                      <td>{formatDate(owner.ownership_start_date)}</td>
                      <td>{formatDate(owner.ownership_end_date)}</td>
                      <td>{owner.mutation_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ownership_history.length === 0 && (
                <p className="text-sm text-muted-foreground italic mt-2">Aucun ancien propriétaire enregistré</p>
              )}
              {ownership_history.filter(o => o.ownership_document_url).map(o => (
                <div key={o.id} className="mt-2">
                  <DocumentAttachment documentUrl={o.ownership_document_url} label={`Titre — ${o.owner_name}`} />
                </div>
              ))}
            </>
          ) : (
            <>
              <SectionTitle number={++sectionNumber} icon={<Clock className="h-4 w-4" />} title="Historique de propriété" />
              <LockedPlaceholder serviceName="Historique des propriétaires" />
            </>
          )}

          {/* ===================== OBLIGATIONS ===================== */}
          {hasAccess('obligations') ? (
            <>
              <SectionTitle number={++sectionNumber} icon={<Receipt className="h-4 w-4" />} title="Obligations financières" />
              
              {/* Taxes */}
              <h4 className="text-sm font-semibold text-foreground mt-4 mb-2 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-primary" /> Taxes foncières
              </h4>
              {tax_history.length > 0 ? (
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Année</th>
                      <th>Montant (USD)</th>
                      <th>Statut</th>
                      <th>Date de paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tax_history.map((tax) => (
                      <tr key={tax.id}>
                        <td className="font-semibold">{tax.tax_year}</td>
                        <td>${tax.amount_usd.toLocaleString()}</td>
                        <td><Badge variant={getPaymentStatusVariant(tax.payment_status)} className="text-xs">{getPaymentStatusLabel(tax.payment_status)}</Badge></td>
                        <td>{tax.payment_date ? formatDate(tax.payment_date) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucune taxe foncière enregistrée</p>
              )}

              {/* Hypothèques */}
              <h4 className="text-sm font-semibold text-foreground mt-6 mb-2 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Statut hypothécaire
              </h4>
              {mortgage_history.length > 0 ? (
                <>
                  {mortgage_history.some(m => ['active', 'Active', 'En cours'].includes(m.mortgage_status)) && (
                    <div className="flex items-center gap-2 p-3 mb-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse print:animate-none" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Parcelle avec hypothèque active</span>
                    </div>
                  )}
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Créancier</th>
                        <th>Montant (USD)</th>
                        <th>Durée</th>
                        <th>Statut</th>
                        <th>Contrat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mortgage_history.map((m) => {
                        const totalPaid = m.payments.reduce((sum, p) => sum + p.payment_amount_usd, 0);
                        const isActive = ['active', 'Active', 'En cours'].includes(m.mortgage_status);
                        return (
                          <tr key={m.id} className={isActive ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                            <td className="font-mono text-xs">{m.reference_number || '—'}</td>
                            <td>{m.creditor_name}<br /><span className="text-xs text-muted-foreground">{m.creditor_type}</span></td>
                            <td>
                              ${m.mortgage_amount_usd.toLocaleString()}
                              {totalPaid > 0 && <><br /><span className="text-xs text-green-600">Remboursé: ${totalPaid.toLocaleString()}</span></>}
                            </td>
                            <td>{m.duration_months} mois</td>
                            <td>
                              <Badge variant={['paid_off', 'Éteinte'].includes(m.mortgage_status) ? 'default' : isActive ? 'secondary' : 'destructive'} className="text-xs">
                                {['paid_off', 'Éteinte'].includes(m.mortgage_status) ? 'Éteinte' : isActive ? 'Active' : 'Défaillante'}
                              </Badge>
                            </td>
                            <td>{formatDate(m.contract_date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Aucune hypothèque enregistrée</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Parcelle libre de charges hypothécaires</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <SectionTitle number={++sectionNumber} icon={<Receipt className="h-4 w-4" />} title="Obligations financières" />
              <LockedPlaceholder serviceName="Obligations fiscales et hypothécaires" />
            </>
          )}

          {/* ===================== LITIGES ===================== */}
          {hasAccess('land_disputes') ? (
            <>
              <SectionTitle number={++sectionNumber} icon={<Scale className="h-4 w-4" />} title="Litiges fonciers" />
              <DisputesSection parcelNumber={parcel.parcel_number} />
            </>
          ) : (
            <>
              <SectionTitle number={++sectionNumber} icon={<Scale className="h-4 w-4" />} title="Litiges fonciers" />
              <LockedPlaceholder serviceName="Litiges fonciers" />
            </>
          )}
        </div>

        {/* Footer / Disclaimer */}
        <div className="px-6 sm:px-10 py-5 border-t-2 border-primary/10 bg-muted/30 print:bg-transparent">
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            <strong>Avis de non-responsabilité :</strong> Le Bureau de l'Immobilier du Congo (BIC) n'assume aucune responsabilité quant à l'exactitude des données affichées, 
            car elles proviennent des archives du Ministère des Affaires Foncières. BIC agit de bonne foi dans son travail de compilation et de présentation de ces informations.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Si vous n'êtes pas satisfait des informations affichées, veuillez contacter le bureau des Affaires Foncières le plus proche de vous 
            pour solliciter une mise à jour des informations concernant la parcelle <span className="font-mono font-semibold">{parcel.parcel_number}</span>.
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .doc-table th {
          text-align: left;
          padding: 0.5rem 0.75rem;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: hsl(var(--muted-foreground));
          border-bottom: 2px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.3);
        }
        .doc-table td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
          vertical-align: top;
        }
        .doc-table tbody tr:hover {
          background: hsl(var(--muted) / 0.15);
        }

        @media print {
          .cadastral-document {
            font-size: 11pt;
          }
          .doc-table {
            font-size: 10pt;
            page-break-inside: avoid;
          }
          .doc-table th {
            background: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default CadastralDocumentView;
