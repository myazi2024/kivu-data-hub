import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { generatePermitPDF } from '@/utils/generatePermitPDF';

interface PermitDownloadButtonProps {
  permit: any;
  className?: string;
}

export function PermitDownloadButton({ permit, className }: PermitDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Récupérer les informations du permis
      const permitNumber = permit.building_permits?.[0]?.permitNumber || 'N/A';
      const permitType = permit.permit_request_data?.permitType || 'construction';
      
      // Construire l'adresse
      const location = [
        permit.province,
        permit.ville,
        permit.commune,
        permit.quartier,
        permit.avenue
      ].filter(Boolean).join(', ');

      // Générer le PDF
      const pdfBlob = await generatePermitPDF({
        permitNumber,
        permitType,
        parcelNumber: permit.parcel_number,
        applicantName: permit.permit_request_data?.applicantName || 'N/A',
        location,
        issueDate: permit.building_permits?.[0]?.issueDate || new Date().toISOString(),
        validityMonths: permit.building_permits?.[0]?.validityMonths || 12,
        approvedBy: 'Service de l\'Urbanisme',
        conditions: [
          'Les travaux doivent être conformes aux plans approuvés',
          'Le chantier doit être signalé aux autorités locales',
          'Une inspection sera effectuée avant la fin des travaux',
          'Le permis doit être affiché sur le chantier de manière visible'
        ]
      });

      // Télécharger le fichier
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Permis_${permitNumber}_${permit.parcel_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Permis téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading permit:', error);
      toast.error('Erreur lors du téléchargement du permis');
    } finally {
      setDownloading(false);
    }
  };

  if (permit.status !== 'approved' && permit.status !== 'verified') {
    return null;
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={downloading}
      className={className}
      variant="default"
      size="sm"
    >
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Téléchargement...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Télécharger le permis
        </>
      )}
    </Button>
  );
}