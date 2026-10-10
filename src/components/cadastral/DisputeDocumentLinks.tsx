import React from 'react';
import { FileText, ExternalLink, Image } from 'lucide-react';
import { toast } from 'sonner';
import { openSignedStorageFile } from '@/utils/storageSignedUrl';

interface DisputeDocumentLinksProps {
  docs: any;
  label: string;
}

/** Documents stockés en chemin privé (ou ancien lien) : ouverts via un lien signé à la demande. */
const DisputeDocumentLinks: React.FC<DisputeDocumentLinksProps> = ({ docs, label }) => {
  if (!docs || (Array.isArray(docs) && docs.length === 0)) return null;
  const docList: string[] = (Array.isArray(docs) ? docs : [docs]).filter((d: unknown) => typeof d === 'string');
  if (docList.length === 0) return null;

  const open = async (src: string) => {
    const ok = await openSignedStorageFile(src);
    if (!ok) toast.error("Document indisponible");
  };

  return (
    <div className="pt-2 border-t">
      <span className="text-xs text-muted-foreground">{label} ({docList.length})</span>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {docList.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => open(src)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 min-h-[44px] rounded-lg"
          >
            {/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(src) ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            Doc {i + 1}
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default DisputeDocumentLinks;
