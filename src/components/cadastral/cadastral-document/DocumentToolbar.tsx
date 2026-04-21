import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentToolbarProps {
  onBackToCatalog: () => void;
  onDownloadReport: () => void | Promise<void>;
  onPrint?: () => void;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({ onBackToCatalog, onDownloadReport, onPrint }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await Promise.resolve(onDownloadReport());
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      toast.error('Impossible de générer le PDF. Réessayez.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="print:hidden flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2.5 px-1 border-b border-border/50">
      <Button variant="outline" size="sm" onClick={onBackToCatalog} className="text-xs" aria-label="Retour au catalogue">
        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
        Catalogue
      </Button>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="text-xs"
        disabled={downloading}
        aria-label="Télécharger la fiche cadastrale au format PDF"
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5 mr-1.5" />
        )}
        {downloading ? 'Génération…' : 'Télécharger PDF'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => (onPrint ? onPrint() : window.print())}
        className="text-xs"
        aria-label="Imprimer la fiche cadastrale"
        title="Imprimer (Ctrl+P)"
      >
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        Imprimer
      </Button>
    </div>
  );
};

export default DocumentToolbar;
