import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, MapPin, FileText, Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ConflictParcel {
  parcelNumber: string;
  ownerName: string;
  location: string;
  overlapArea?: number;
}

interface BoundaryConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentParcelNumber: string;
  conflictingParcels: ConflictParcel[];
  coordinates: any[];
}

export const BoundaryConflictDialog = ({
  open,
  onOpenChange,
  currentParcelNumber,
  conflictingParcels,
  coordinates
}: BoundaryConflictDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<string>('');
  const [conflictType, setConflictType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const conflictTypes = [
    { value: 'overlap', label: 'Chevauchement de limites' },
    { value: 'encroachment', label: 'Empiètement sur parcelle voisine' },
    { value: 'disputed_boundary', label: 'Limite contestée' },
    { value: 'measurement_error', label: 'Erreur de mesure' },
    { value: 'other', label: 'Autre' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setEvidenceFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedParcel || !conflictType || !description) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Upload evidence files
      const evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        setUploading(true);
        for (const file of evidenceFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `boundary-conflicts/${user?.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('cadastral-documents')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('cadastral-documents')
            .getPublicUrl(filePath);

          evidenceUrls.push(publicUrl);
        }
        setUploading(false);
      }

      // Save conflict report
      const { error } = await supabase.from('cadastral_boundary_conflicts').insert({
        reporting_parcel_number: currentParcelNumber,
        conflicting_parcel_number: selectedParcel,
        conflict_type: conflictType,
        description,
        proposed_solution: proposedSolution || null,
        evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : null,
        conflict_coordinates: coordinates,
        reported_by: user?.id,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Conflit signalé",
        description: "Votre signalement a été enregistré. Un administrateur examinera le cas.",
      });

      // Reset form
      setSelectedParcel('');
      setConflictType('');
      setDescription('');
      setProposedSolution('');
      setEvidenceFiles([]);
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error submitting conflict:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le signalement. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler un conflit de limites
          </DialogTitle>
          <DialogDescription>
            Signalez un conflit ou un chevauchement avec une parcelle voisine
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Un conflit de limites a été détecté entre votre parcelle et {conflictingParcels.length} parcelle(s) voisine(s).
            </AlertDescription>
          </Alert>

          <div>
            <Label>Votre parcelle</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md mt-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{currentParcelNumber}</span>
            </div>
          </div>

          <div>
            <Label className="text-destructive">Parcelle en conflit *</Label>
            <Select value={selectedParcel} onValueChange={setSelectedParcel}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionnez la parcelle concernée" />
              </SelectTrigger>
              <SelectContent>
                {conflictingParcels.map((parcel) => (
                  <SelectItem key={parcel.parcelNumber} value={parcel.parcelNumber}>
                    <div className="flex flex-col">
                      <span className="font-medium">{parcel.parcelNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {parcel.ownerName} - {parcel.location}
                      </span>
                      {parcel.overlapArea && (
                        <Badge variant="destructive" className="w-fit text-xs mt-1">
                          Chevauchement: {parcel.overlapArea.toFixed(2)} m²
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-destructive">Type de conflit *</Label>
            <Select value={conflictType} onValueChange={setConflictType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionnez le type de conflit" />
              </SelectTrigger>
              <SelectContent>
                {conflictTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-destructive">Description du conflit *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez en détail la nature du conflit, les limites contestées, etc."
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div>
            <Label>Solution proposée (optionnel)</Label>
            <Textarea
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              placeholder="Si vous avez une suggestion pour résoudre ce conflit, décrivez-la ici"
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div>
            <Label>Preuves (documents, photos, plans) (optionnel)</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('evidence-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter des fichiers
                </Button>
                <input
                  id="evidence-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {evidenceFiles.length > 0 && (
                <div className="space-y-2">
                  {evidenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || uploading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || !selectedParcel || !conflictType || !description}
          >
            {loading || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? 'Téléchargement...' : 'Enregistrement...'}
              </>
            ) : (
              'Signaler le conflit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
