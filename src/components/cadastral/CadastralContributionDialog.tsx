import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { Loader2, CheckCircle2, Upload, X, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CadastralContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
}

const CadastralContributionDialog: React.FC<CadastralContributionDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber
}) => {
  const { submitContribution, loading } = useCadastralContribution();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [requestWhatsAppNotif, setRequestWhatsAppNotif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ownerDocFile, setOwnerDocFile] = useState<File | null>(null);
  const [titleDocFile, setTitleDocFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<CadastralContributionData>({
    parcelNumber: parcelNumber,
    whatsappNumber: '',
  });

  const handleInputChange = (field: keyof CadastralContributionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'owner' | 'title') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non valide",
        description: "Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 MB",
        variant: "destructive"
      });
      return;
    }
    
    if (type === 'owner') {
      setOwnerDocFile(file);
    } else {
      setTitleDocFile(file);
    }
  };

  const removeFile = (type: 'owner' | 'title') => {
    if (type === 'owner') {
      setOwnerDocFile(null);
    } else {
      setTitleDocFile(null);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cadastral-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    
    try {
      // Upload files if provided
      let ownerDocUrl = null;
      let titleDocUrl = null;

      if (ownerDocFile) {
        ownerDocUrl = await uploadFile(ownerDocFile, 'owner-documents');
        if (!ownerDocUrl) {
          toast({
            title: "Erreur de téléchargement",
            description: "Impossible de télécharger le document du propriétaire",
            variant: "destructive"
          });
          setUploading(false);
          return;
        }
      }

      if (titleDocFile) {
        titleDocUrl = await uploadFile(titleDocFile, 'title-documents');
        if (!titleDocUrl) {
          toast({
            title: "Erreur de téléchargement",
            description: "Impossible de télécharger le document de titre",
            variant: "destructive"
          });
          setUploading(false);
          return;
        }
      }

      // Add document URLs to form data
      const dataToSubmit = {
        ...formData,
        ownerDocumentUrl: ownerDocUrl || undefined,
        titleDocumentUrl: titleDocUrl || undefined,
      };

      const result = await submitContribution(dataToSubmit);
      
      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setShowSuccess(true);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({ parcelNumber: parcelNumber, whatsappNumber: '' });
    setShowSuccess(false);
    setGeneratedCode('');
    setRequestWhatsAppNotif(false);
    setOwnerDocFile(null);
    setTitleDocFile(null);
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary animate-scale-in" />
            <DialogTitle className="text-2xl text-center">Merci pour votre contribution !</DialogTitle>
            <DialogDescription className="text-center">
              Votre contribution pour la parcelle <strong>{parcelNumber}</strong> a été enregistrée.
              Elle sera vérifiée par notre équipe.
            </DialogDescription>
            <div className="bg-primary/10 p-4 rounded-lg w-full">
              <p className="text-sm text-muted-foreground mb-2">Votre Code Contributeur Cadastral :</p>
              <p className="text-2xl font-bold text-primary text-center tracking-wider">{generatedCode}</p>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Valeur : 5 USD • Expire dans 90 jours
              </p>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Vous pouvez utiliser ce code pour payer vos prochains services cadastraux.
            </p>
            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contribuer aux informations cadastrales</DialogTitle>
          <DialogDescription>
            Parcelle : <strong>{parcelNumber}</strong>
            <br />
            Renseignez les informations que vous possédez sur cette parcelle.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="location">Localisation</TabsTrigger>
            <TabsTrigger value="history">Historiques</TabsTrigger>
            <TabsTrigger value="obligations">Obligations</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="titleType">Type de titre de propriété</Label>
              <Select onValueChange={(value) => handleInputChange('propertyTitleType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Certificat d'enregistrement">Certificat d'enregistrement</SelectItem>
                  <SelectItem value="Titre foncier">Titre foncier</SelectItem>
                  <SelectItem value="Concession perpétuelle">Concession perpétuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Nom du propriétaire actuel</Label>
              <Input
                id="ownerName"
                placeholder="Nom complet"
                value={formData.currentOwnerName || ''}
                onChange={(e) => handleInputChange('currentOwnerName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalStatus">Statut juridique</Label>
              <Select onValueChange={(value) => handleInputChange('currentOwnerLegalStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personne physique">Personne physique</SelectItem>
                  <SelectItem value="Personne morale">Personne morale</SelectItem>
                  <SelectItem value="État">État</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerSince">Propriétaire depuis</Label>
              <Input
                id="ownerSince"
                type="date"
                value={formData.currentOwnerSince || ''}
                onChange={(e) => handleInputChange('currentOwnerSince', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Superficie (m²)</Label>
              <Input
                id="area"
                type="number"
                placeholder="ex: 500"
                value={formData.areaSqm || ''}
                onChange={(e) => handleInputChange('areaSqm', parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionType">Type de construction</Label>
              <Input
                id="constructionType"
                placeholder="ex: Résidentielle, Commerciale, Industrielle"
                value={formData.constructionType || ''}
                onChange={(e) => handleInputChange('constructionType', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionNature">Nature de construction</Label>
              <Select onValueChange={(value) => handleInputChange('constructionNature', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Durable">Durable</SelectItem>
                  <SelectItem value="Semi-durable">Semi-durable</SelectItem>
                  <SelectItem value="Précaire">Précaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="declaredUsage">Usage déclaré</Label>
              <Input
                id="declaredUsage"
                placeholder="ex: Habitation, Commerce, Usage mixte"
                value={formData.declaredUsage || ''}
                onChange={(e) => handleInputChange('declaredUsage', e.target.value)}
              />
            </div>

            {/* File uploads section */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold">Pièces jointes (optionnel)</h4>
              
              {/* Owner document */}
              <div className="space-y-2">
                <Label htmlFor="ownerDoc">Document d'identité du propriétaire</Label>
                {!ownerDocFile ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="ownerDoc"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e, 'owner')}
                      className="cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{ownerDocFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile('owner')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP ou PDF - Max 5 MB
                </p>
              </div>

              {/* Title document */}
              <div className="space-y-2">
                <Label htmlFor="titleDoc">Document du titre de propriété</Label>
                {!titleDocFile ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="titleDoc"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e, 'title')}
                      className="cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{titleDocFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile('title')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP ou PDF - Max 5 MB
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                placeholder="ex: Nord-Kivu"
                value={formData.province || ''}
                onChange={(e) => handleInputChange('province', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                placeholder="ex: Goma"
                value={formData.ville || ''}
                onChange={(e) => handleInputChange('ville', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Input
                id="commune"
                placeholder="ex: Goma"
                value={formData.commune || ''}
                onChange={(e) => handleInputChange('commune', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quartier">Quartier</Label>
              <Input
                id="quartier"
                placeholder="ex: Himbi"
                value={formData.quartier || ''}
                onChange={(e) => handleInputChange('quartier', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avenue">Avenue</Label>
              <Input
                id="avenue"
                placeholder="ex: Avenue de l'Université"
                value={formData.avenue || ''}
                onChange={(e) => handleInputChange('avenue', e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground">Pour les zones rurales</h4>
              
              <div className="space-y-2">
                <Label htmlFor="territoire">Territoire</Label>
                <Input
                  id="territoire"
                  placeholder="ex: Masisi"
                  value={formData.territoire || ''}
                  onChange={(e) => handleInputChange('territoire', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectivite">Collectivité</Label>
                <Input
                  id="collectivite"
                  placeholder="ex: Osso-Banyungu"
                  value={formData.collectivite || ''}
                  onChange={(e) => handleInputChange('collectivite', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupement">Groupement</Label>
                <Input
                  id="groupement"
                  placeholder="ex: Katoyi"
                  value={formData.groupement || ''}
                  onChange={(e) => handleInputChange('groupement', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Input
                  id="village"
                  placeholder="ex: Mushaki"
                  value={formData.village || ''}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Historique des propriétaires</Label>
              <Textarea
                placeholder="Décrivez l'historique de propriété si vous le connaissez..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Exemple : "Propriété de M. X de 2010 à 2015, puis vendue à M. Y"
              </p>
            </div>

            <div className="space-y-2">
              <Label>Historique de bornage</Label>
              <Textarea
                placeholder="Informations sur les opérations de bornage..."
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Historique des taxes</Label>
              <Textarea
                placeholder="Informations sur les taxes foncières payées..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Hypothèques</Label>
              <Textarea
                placeholder="Informations sur les hypothèques ou charges..."
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox 
            id="whatsapp" 
            checked={requestWhatsAppNotif}
            onCheckedChange={(checked) => setRequestWhatsAppNotif(checked as boolean)}
          />
          <Label htmlFor="whatsapp" className="text-sm cursor-pointer">
            M'informer par WhatsApp si les informations sont validées
          </Label>
        </div>

        {requestWhatsAppNotif && (
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Numéro WhatsApp</Label>
            <Input
              id="whatsapp-number"
              placeholder="+243 XXX XXX XXX"
              value={formData.whatsappNumber || ''}
              onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploading} className="flex-1">
            {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? 'Téléchargement...' : 'Soumettre la contribution'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralContributionDialog;
