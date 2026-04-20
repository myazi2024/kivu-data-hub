import React, { useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Share2, Copy, Download, MessageCircle, Twitter, Facebook, Linkedin, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  /** Async function returning a PNG Blob to share */
  getBlob: () => Promise<Blob>;
  /** Title used as filename + share text */
  title: string;
  /** Visual size variant */
  variant?: 'chart' | 'map';
  /** Extra className for the trigger button */
  className?: string;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'partage';

const canShareFiles = (file: File): boolean => {
  try {
    return typeof navigator !== 'undefined'
      && typeof navigator.share === 'function'
      && typeof (navigator as any).canShare === 'function'
      && (navigator as any).canShare({ files: [file] });
  } catch {
    return false;
  }
};

const ShareButton: React.FC<ShareButtonProps> = ({ getBlob, title, variant = 'chart', className }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const filename = `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.png`;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${title} — BIC`;

  const tryNativeShare = async (blob: Blob): Promise<boolean> => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (!canShareFiles(file)) return false;
    try {
      await (navigator as any).share({ files: [file], title, text: shareText, url: pageUrl });
      return true;
    } catch (e: any) {
      // User cancelled or error
      if (e?.name === 'AbortError') return true;
      return false;
    }
  };

  const handleTriggerClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    // Try native share first (mobile / supported browsers)
    setBusy(true);
    try {
      const blob = await getBlob();
      const native = await tryNativeShare(blob);
      if (native) {
        setBusy(false);
        return;
      }
      // Fallback: toggle popover manually
      setOpen((o) => !o);
    } catch {
      toast.error("Impossible de générer l'image");
    } finally {
      setBusy(false);
    }
  };

  const withBlob = async (action: (blob: Blob) => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await getBlob();
      await action(blob);
    } catch {
      toast.error("Action impossible");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const copyImage = () => withBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('Image copiée');
    } catch {
      toast.error('Presse-papiers indisponible');
    }
  });

  const downloadImage = () => withBlob(async (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success('Image téléchargée');
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible');
    }
    setOpen(false);
  };

  const openIntent = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=560');
    setOpen(false);
  };

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(pageUrl);

  const sizeClass = variant === 'map'
    ? 'h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm flex items-center justify-center hover:bg-background transition-colors'
    : 'p-0.5 rounded hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground';
  const iconClass = variant === 'map' ? 'h-3 w-3 text-muted-foreground' : 'h-3 w-3';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          onClick={handleTriggerClick}
          className={`${sizeClass} ${className || ''}`}
          title="Partager"
          aria-label="Partager"
          disabled={busy}
        >
          <Share2 className={iconClass} />
        </button>
      </PopoverAnchor>
      <PopoverContent
        className="w-56 p-1"
        align="end"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[9px] font-medium text-muted-foreground px-2 py-1">Partager</p>
        <div className="space-y-0.5">
          <ShareItem icon={Copy} label="Copier l'image" onClick={copyImage} />
          <ShareItem icon={Download} label="Télécharger (PNG)" onClick={downloadImage} />
          <div className="my-1 border-t border-border" />
          <ShareItem icon={MessageCircle} label="WhatsApp" onClick={() => openIntent(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)} />
          <ShareItem icon={Twitter} label="X (Twitter)" onClick={() => openIntent(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)} />
          <ShareItem icon={Facebook} label="Facebook" onClick={() => openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)} />
          <ShareItem icon={Linkedin} label="LinkedIn" onClick={() => openIntent(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)} />
          <div className="my-1 border-t border-border" />
          <ShareItem icon={LinkIcon} label="Copier le lien" onClick={copyLink} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ShareItem: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded hover:bg-muted/80 transition-colors text-foreground"
  >
    <Icon className="h-3 w-3 text-muted-foreground" />
    <span>{label}</span>
  </button>
);

export default ShareButton;
