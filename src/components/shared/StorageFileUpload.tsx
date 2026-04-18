import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, X, Loader2, FileText, ImageIcon } from 'lucide-react';

interface StorageFileUploadProps {
  bucket: string;
  value: string | null;
  onChange: (url: string | null, path?: string | null) => void;
  accept?: string;
  /** Si true, retourne l'URL publique. Sinon retourne le path (bucket privé). */
  isPublic?: boolean;
  label?: string;
  maxSizeMB?: number;
  pathPrefix?: string;
}

export const StorageFileUpload = ({
  bucket,
  value,
  onChange,
  accept = 'image/*',
  isPublic = true,
  label = 'Fichier',
  maxSizeMB = 10,
  pathPrefix = '',
}: StorageFileUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const isImage = accept.includes('image');

  const handleUpload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Le fichier dépasse ${maxSizeMB}MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = pathPrefix ? `${pathPrefix}/${filename}` : filename;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;

      if (isPublic) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        onChange(data.publicUrl, path);
      } else {
        onChange(path, path);
      }
      toast.success('Fichier téléversé');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erreur de téléversement');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => onChange(null, null);

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2 rounded-md border border-input p-2">
          {isImage && isPublic ? (
            <img src={value} alt="" className="h-12 w-12 rounded object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
              {isImage ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
            </div>
          )}
          <div className="flex-1 truncate text-xs text-muted-foreground">{value}</div>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {label} · max {maxSizeMB}MB {isPublic ? '· bucket public' : '· bucket privé'}
      </p>
    </div>
  );
};

export default StorageFileUpload;
