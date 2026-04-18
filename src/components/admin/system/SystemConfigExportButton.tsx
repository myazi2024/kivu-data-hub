import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileArchive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportSystemConfigZip } from '@/utils/exportSystemConfig';
import { useAuth } from '@/hooks/useAuth';

export const SystemConfigExportButton = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleExport = async () => {
    setLoading(true);
    try {
      const m = await exportSystemConfigZip(user?.email);
      toast.success(`Export ZIP : ${m.tables.length} tables`);
    } catch (e: any) {
      toast.error('Erreur export', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm">
      {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileArchive className="h-3.5 w-3.5 mr-1" />}
      Exporter config (ZIP)
    </Button>
  );
};

export default SystemConfigExportButton;
