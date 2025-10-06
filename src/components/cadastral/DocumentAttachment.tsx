import React from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DocumentAttachmentProps {
  documentUrl: string | null;
  label: string;
  description?: string;
}

const DocumentAttachment: React.FC<DocumentAttachmentProps> = ({ 
  documentUrl, 
  label,
  description 
}) => {
  if (!documentUrl) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(documentUrl, '_blank');
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(documentUrl, '_blank');
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="p-2 rounded-md bg-primary/10">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium truncate">{label}</p>
          <Badge variant="secondary" className="text-xs">PDF</Badge>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleView}
          className="h-8 w-8"
          title="Voir le document"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="h-8 w-8"
          title="Télécharger"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DocumentAttachment;
