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
              <Select onValueChange={(value) => handleInputChange('constructionType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                  <SelectItem value="Commerciale">Commerciale</SelectItem>
                  <SelectItem value="Industrielle">Industrielle</SelectItem>
                  <SelectItem value="Agricole">Agricole</SelectItem>
                  <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                  <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="Non bâti">Non bâti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="declaredUsage">Usage déclaré</Label>
              <Select onValueChange={(value) => handleInputChange('declaredUsage', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Habitation">Habitation</SelectItem>
                  <SelectItem value="Commerce">Commerce</SelectItem>
                  <SelectItem value="Bureau">Bureau</SelectItem>
                  <SelectItem value="Industrie">Industrie</SelectItem>
                  <SelectItem value="Agriculture">Agriculture</SelectItem>
                  <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                  <SelectItem value="Entrepôt">Entrepôt</SelectItem>
                  <SelectItem value="Terrain vacant">Terrain vacant</SelectItem>
                </SelectContent>
              </Select>
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
              <Select onValueChange={(value) => handleInputChange('province', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nord-Kivu">Nord-Kivu</SelectItem>
                  <SelectItem value="Sud-Kivu">Sud-Kivu</SelectItem>
                  <SelectItem value="Kinshasa">Kinshasa</SelectItem>
                  <SelectItem value="Kongo-Central">Kongo-Central</SelectItem>
                  <SelectItem value="Kwilu">Kwilu</SelectItem>
                  <SelectItem value="Kwango">Kwango</SelectItem>
                  <SelectItem value="Mai-Ndombe">Mai-Ndombe</SelectItem>
                  <SelectItem value="Kasaï">Kasaï</SelectItem>
                  <SelectItem value="Kasaï-Central">Kasaï-Central</SelectItem>
                  <SelectItem value="Kasaï-Oriental">Kasaï-Oriental</SelectItem>
                  <SelectItem value="Lomami">Lomami</SelectItem>
                  <SelectItem value="Sankuru">Sankuru</SelectItem>
                  <SelectItem value="Maniema">Maniema</SelectItem>
                  <SelectItem value="Ituri">Ituri</SelectItem>
                  <SelectItem value="Haut-Uele">Haut-Uele</SelectItem>
                  <SelectItem value="Bas-Uele">Bas-Uele</SelectItem>
                  <SelectItem value="Tshopo">Tshopo</SelectItem>
                  <SelectItem value="Mongala">Mongala</SelectItem>
                  <SelectItem value="Nord-Ubangi">Nord-Ubangi</SelectItem>
                  <SelectItem value="Sud-Ubangi">Sud-Ubangi</SelectItem>
                  <SelectItem value="Équateur">Équateur</SelectItem>
                  <SelectItem value="Tshuapa">Tshuapa</SelectItem>
                  <SelectItem value="Tanganyika">Tanganyika</SelectItem>
                  <SelectItem value="Haut-Lomami">Haut-Lomami</SelectItem>
                  <SelectItem value="Lualaba">Lualaba</SelectItem>
                  <SelectItem value="Haut-Katanga">Haut-Katanga</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Select onValueChange={(value) => handleInputChange('ville', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Goma">Goma</SelectItem>
                  <SelectItem value="Bukavu">Bukavu</SelectItem>
                  <SelectItem value="Kinshasa">Kinshasa</SelectItem>
                  <SelectItem value="Lubumbashi">Lubumbashi</SelectItem>
                  <SelectItem value="Kisangani">Kisangani</SelectItem>
                  <SelectItem value="Butembo">Butembo</SelectItem>
                  <SelectItem value="Beni">Beni</SelectItem>
                  <SelectItem value="Uvira">Uvira</SelectItem>
                  <SelectItem value="Bunia">Bunia</SelectItem>
                  <SelectItem value="Kolwezi">Kolwezi</SelectItem>
                  <SelectItem value="Matadi">Matadi</SelectItem>
                  <SelectItem value="Mbandaka">Mbandaka</SelectItem>
                  <SelectItem value="Kananga">Kananga</SelectItem>
                  <SelectItem value="Mbuji-Mayi">Mbuji-Mayi</SelectItem>
                  <SelectItem value="Likasi">Likasi</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Select onValueChange={(value) => handleInputChange('commune', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la commune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Goma">Goma</SelectItem>
                  <SelectItem value="Karisimbi">Karisimbi</SelectItem>
                  <SelectItem value="Ibanda">Ibanda</SelectItem>
                  <SelectItem value="Bagira">Bagira</SelectItem>
                  <SelectItem value="Kadutu">Kadutu</SelectItem>
                  <SelectItem value="Kampemba">Kampemba</SelectItem>
                  <SelectItem value="Kenya">Kenya</SelectItem>
                  <SelectItem value="Katuba">Katuba</SelectItem>
                  <SelectItem value="Annexe">Annexe</SelectItem>
                  <SelectItem value="Lubumbashi">Lubumbashi</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
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
                <Select onValueChange={(value) => handleInputChange('territoire', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le territoire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masisi">Masisi</SelectItem>
                    <SelectItem value="Rutshuru">Rutshuru</SelectItem>
                    <SelectItem value="Nyiragongo">Nyiragongo</SelectItem>
                    <SelectItem value="Walikale">Walikale</SelectItem>
                    <SelectItem value="Lubero">Lubero</SelectItem>
                    <SelectItem value="Beni">Beni</SelectItem>
                    <SelectItem value="Oicha">Oicha</SelectItem>
                    <SelectItem value="Fizi">Fizi</SelectItem>
                    <SelectItem value="Uvira">Uvira</SelectItem>
                    <SelectItem value="Mwenga">Mwenga</SelectItem>
                    <SelectItem value="Shabunda">Shabunda</SelectItem>
                    <SelectItem value="Walungu">Walungu</SelectItem>
                    <SelectItem value="Kabare">Kabare</SelectItem>
                    <SelectItem value="Kalehe">Kalehe</SelectItem>
                    <SelectItem value="Idjwi">Idjwi</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Historique de propriété (optionnel)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Si vous connaissez un ancien propriétaire, renseignez ces informations
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prevOwner">Nom de l'ancien propriétaire</Label>
                <Input
                  id="prevOwner"
                  placeholder="ex: Jean Mukendi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prevOwnerStatus">Statut juridique</Label>
                <Select>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prevStartDate">Date début</Label>
                  <Input id="prevStartDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prevEndDate">Date fin</Label>
                  <Input id="prevEndDate" type="date" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mutationType">Type de mutation</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vente">Vente</SelectItem>
                    <SelectItem value="Donation">Donation</SelectItem>
                    <SelectItem value="Succession">Succession</SelectItem>
                    <SelectItem value="Expropriation">Expropriation</SelectItem>
                    <SelectItem value="Échange">Échange</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div>
                <Label className="text-sm font-semibold">Historique de bornage (optionnel)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Si vous connaissez une opération de bornage, renseignez ces informations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pvRef">Numéro de référence du PV</Label>
                <Input
                  id="pvRef"
                  placeholder="ex: PV-NK-2023-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boundaryPurpose">Objectif du bornage</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'objectif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Délimitation initiale">Délimitation initiale</SelectItem>
                    <SelectItem value="Bornage contradictoire">Bornage contradictoire</SelectItem>
                    <SelectItem value="Réfection de bornes">Réfection de bornes</SelectItem>
                    <SelectItem value="Division parcellaire">Division parcellaire</SelectItem>
                    <SelectItem value="Régularisation">Régularisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surveyorName">Nom du géomètre</Label>
                <Input
                  id="surveyorName"
                  placeholder="ex: Géomètre Kalala"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surveyDate">Date de l'opération</Label>
                <Input id="surveyDate" type="date" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Historique des taxes (optionnel)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Si vous connaissez une taxe payée, renseignez ces informations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxYear">Année fiscale</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'année" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                    <SelectItem value="2019">2019</SelectItem>
                    <SelectItem value="2018">2018</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxAmount">Montant payé (USD)</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  placeholder="ex: 150"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Statut de paiement</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payé">Payé</SelectItem>
                    <SelectItem value="Payé partiellement">Payé partiellement</SelectItem>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="En retard">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Date de paiement</Label>
                <Input id="paymentDate" type="date" />
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div>
                <Label className="text-sm font-semibold">Hypothèque (optionnel)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Si la parcelle a une hypothèque, renseignez ces informations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mortgageAmount">Montant de l'hypothèque (USD)</Label>
                <Input
                  id="mortgageAmount"
                  type="number"
                  placeholder="ex: 50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durée (mois)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="ex: 120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditorName">Nom du créancier</Label>
                <Input
                  id="creditorName"
                  placeholder="ex: Banque XYZ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditorType">Type de créancier</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Banque">Banque</SelectItem>
                    <SelectItem value="Microfinance">Microfinance</SelectItem>
                    <SelectItem value="Coopérative">Coopérative</SelectItem>
                    <SelectItem value="Particulier">Particulier</SelectItem>
                    <SelectItem value="Autre institution">Autre institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractDate">Date du contrat</Label>
                <Input id="contractDate" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mortgageStatus">Statut de l'hypothèque</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Remboursée">Remboursée</SelectItem>
                    <SelectItem value="En défaut">En défaut</SelectItem>
                    <SelectItem value="Renégociée">Renégociée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
