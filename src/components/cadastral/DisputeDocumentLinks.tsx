import React from 'react';
import { FileText, ExternalLink, Image } from 'lucide-react';

interface DisputeDocumentLinksProps {
  docs: any;
  label: string;
}

const DisputeDocumentLinks: React.FC<DisputeDocumentLinksProps> = ({ docs, label }) => {
  if (!docs || (Array.isArray(docs) && docs.length === 0)) return null;
  const docList = Array.isArray(docs) ? docs : [docs];
  if (docList.length === 0) return null;

  return (
    <div className="pt-2 border-t">
      <span className="text-xs text-muted-foreground">{label} ({docList.length})</span>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {docList.map((url: string, i: number) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-lg"
          >
            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            Doc {i + 1}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default DisputeDocumentLinks;
