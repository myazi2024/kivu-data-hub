import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, ShoppingCart } from 'lucide-react';

interface DocumentToolbarProps {
  onBackToCatalog: () => void;
  onDownloadReport: () => void;
}

const DocumentToolbar: React.FC<DocumentToolbarProps> = ({ onBackToCatalog, onDownloadReport }) => (
  <div className="print:hidden flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2.5 px-1 border-b border-border/50">
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
);

export default DocumentToolbar;
