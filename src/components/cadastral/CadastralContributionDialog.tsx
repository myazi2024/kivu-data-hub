import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { Loader2, CheckCircle2, Upload, X, FileText, Plus, Trash2, MapPin, Info, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllProvinces, 
  getVillesForProvince, 
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier
} from '@/lib/geographicData';
import { InputWithPopover } from './InputWithPopover';
import { PropertyTitleTypeSelect, PROPERTY_TITLE_TYPES } from './PropertyTitleTypeSelect';
import { BuildingPermitIssuingServiceSelect } from './BuildingPermitIssuingServiceSelect';
import BuildingPermitRequestDialog from './BuildingPermitRequestDialog';

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
  const [requestWhatsAppNotif, setRequestWhatsAppNotif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ownerDocFile, setOwnerDocFile] = useState<File | null>(null);
  const [titleDocFiles, setTitleDocFiles] = useState<File[]>([]);
  const [showPermitRequestDialog, setShowPermitRequestDialog] = useState(false);
  const [permitActionMode, setPermitActionMode] = useState<'demander' | 'ajouter' | null>(null);
  
  // État pour gérer plusieurs anciens propriétaires
  const [previousOwners, setPreviousOwners] = useState<Array<{
    name: string;
    legalStatus: string;
    startDate: string;
    endDate: string;
    mutationType: string;
    surveyDate?: string;
    surveyorName?: string;
    pvReferenceNumber?: string;
  }>>([]);

  // État pour gérer plusieurs propriétaires actuels (copropriété)
  const [currentOwners, setCurrentOwners] = useState<Array<{
    lastName: string;
    middleName: string;
    firstName: string;
    legalStatus: string;
    since: string;
  }>>([{
    lastName: '',
    middleName: '',
    firstName: '',
    legalStatus: 'Personne physique',
    since: ''
  }]);

  // État pour gérer plusieurs taxes
  const [taxRecords, setTaxRecords] = useState<Array<{
    taxType: string;
    taxYear: string;
    taxAmount: string;
    paymentStatus: string;
    paymentDate: string;
    receiptFile: File | null;
  }>>([]);

  // État pour gérer plusieurs hypothèques
  const [mortgageRecords, setMortgageRecords] = useState<Array<{
    mortgageAmount: string;
    duration: string;
    creditorName: string;
    creditorType: string;
    contractDate: string;
    mortgageStatus: string;
    receiptFile: File | null;
  }>>([]);
  
  // État pour gérer les permis de construire
  const [buildingPermits, setBuildingPermits] = useState<Array<{
    permitNumber: string;
    issuingService: string;
    issueDate: string;
    validityMonths: string;
    administrativeStatus: string;
    issuingServiceContact: string;
  }>>([]);
  
  // État pour gérer les coordonnées GPS des bornes
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{
    borne: string;
    lat: string;
    lng: string;
  }>>([]);

  // État pour le switch Taxes/Hypothèques dans l'onglet obligations
  const [obligationType, setObligationType] = useState<'taxes' | 'mortgages'>('taxes');

  // États pour gérer les options de dépendance Type de construction -> Nature -> Usage
  const [availableConstructionNatures, setAvailableConstructionNatures] = useState<string[]>([]);
  const [availableDeclaredUsages, setAvailableDeclaredUsages] = useState<string[]>([]);

  const [formData, setFormData] = useState<CadastralContributionData>({
    parcelNumber: parcelNumber,
    whatsappNumber: '',
  });

  // État pour gérer les dimensions des côtés de la parcelle
  const [parcelSides, setParcelSides] = useState<Array<{
    name: string;
    length: string;
  }>>([
    { name: 'Côté Nord', length: '' },
    { name: 'Côté Sud', length: '' },
    { name: 'Côté Est', length: '' },
    { name: 'Côté Ouest', length: '' }
  ]);

  // États pour gérer les listes déroulantes dépendantes
  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);
  const [availableAvenues, setAvailableAvenues] = useState<string[]>([]);
  
  // État pour déterminer le type de section (SU ou SR)
  const [sectionType, setSectionType] = useState<'urbaine' | 'rurale' | ''>('');
  const [sectionTypeAutoDetected, setSectionTypeAutoDetected] = useState(false);

  // Détecter automatiquement le type de section à partir du préfixe du numéro de parcelle
  useEffect(() => {
    if (parcelNumber) {
      const upperParcelNumber = parcelNumber.toUpperCase().trim();
      
      if (upperParcelNumber.startsWith('SU')) {
        setSectionType('urbaine');
        setSectionTypeAutoDetected(true);
      } else if (upperParcelNumber.startsWith('SR')) {
        setSectionType('rurale');
        setSectionTypeAutoDetected(true);
      } else {
        setSectionType('');
        setSectionTypeAutoDetected(false);
      }
    }
  }, [parcelNumber]);

  // Recalculer automatiquement la superficie quand les dimensions changent
  useEffect(() => {
    const sides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    
    if (sides.length < 3) return;

    // Pour une forme rectangulaire simple (4 côtés)
    if (sides.length === 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      
      // Pour un rectangle : Nord/Sud sont opposés et Est/Ouest sont opposés
      // Indices : 0=Nord, 1=Sud, 2=Est, 3=Ouest
      const isRectangle = (
        Math.abs(lengths[0] - lengths[1]) < 0.1 &&  // Nord ≈ Sud
        Math.abs(lengths[2] - lengths[3]) < 0.1     // Est ≈ Ouest
      );
      
      if (isRectangle) {
        // Rectangle: côté Nord × côté Est
        const area = lengths[0] * lengths[2];
        handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
        return;
      }
      
      // Si pas un rectangle parfait, utiliser la formule de Brahmagupta
      const s = (lengths[0] + lengths[1] + lengths[2] + lengths[3]) / 2;
      const area = Math.sqrt(
        (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]) * (s - lengths[3])
      );
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour 2 côtés (forme rectangulaire simplifiée)
    if (sides.length === 2) {
      const length1 = parseFloat(sides[0].length);
      const length2 = parseFloat(sides[1].length);
      const area = length1 * length2;
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour 3 côtés (triangle) : formule de Héron
    if (sides.length === 3) {
      const lengths = sides.map(s => parseFloat(s.length));
      const s = (lengths[0] + lengths[1] + lengths[2]) / 2;
      const area = Math.sqrt(s * (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour plus de 4 côtés, utiliser une approximation
    if (sides.length > 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      const perimeter = lengths.reduce((a, b) => a + b, 0);
      const area = (perimeter * perimeter) / (4 * sides.length * Math.tan(Math.PI / sides.length));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
    }
  }, [parcelSides]);

  // Mise à jour des villes quand la province change
  useEffect(() => {
    if (formData.province) {
      const villes = getVillesForProvince(formData.province);
      setAvailableVilles(villes);
      const territoires = getTerritoiresForProvince(formData.province);
      setAvailableTerritoires(territoires);
      
      // Réinitialiser les niveaux inférieurs si la province change
      if (!villes.includes(formData.ville || '')) {
        handleInputChange('ville', undefined);
        setAvailableCommunes([]);
        handleInputChange('commune', undefined);
      }
      if (!territoires.includes(formData.territoire || '')) {
        handleInputChange('territoire', undefined);
        setAvailableCollectivites([]);
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableVilles([]);
      setAvailableCommunes([]);
      setAvailableTerritoires([]);
      setAvailableCollectivites([]);
    }
  }, [formData.province]);

  // Mise à jour des communes quand la ville change
  useEffect(() => {
    if (formData.province && formData.ville) {
      const communes = getCommunesForVille(formData.province, formData.ville);
      setAvailableCommunes(communes);
      
      // Réinitialiser la commune si elle n'est plus valide
      if (!communes.includes(formData.commune || '')) {
        handleInputChange('commune', undefined);
        setAvailableQuartiers([]);
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableCommunes([]);
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville]);

  // Mise à jour des quartiers quand la commune change
  useEffect(() => {
    if (formData.province && formData.ville && formData.commune) {
      const quartiers = getQuartiersForCommune(formData.province, formData.ville, formData.commune);
      setAvailableQuartiers(quartiers);
      
      // Réinitialiser le quartier si il n'est plus valide
      if (!quartiers.includes(formData.quartier || '')) {
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville, formData.commune]);

  // Mise à jour des avenues quand le quartier change
  useEffect(() => {
    if (formData.province && formData.ville && formData.commune && formData.quartier) {
      const avenues = getAvenuesForQuartier(formData.province, formData.ville, formData.commune, formData.quartier);
      setAvailableAvenues(avenues);
      
      // Réinitialiser l'avenue si elle n'est plus valide
      if (!avenues.includes(formData.avenue || '')) {
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville, formData.commune, formData.quartier]);

  // Mise à jour des collectivités quand le territoire change
  useEffect(() => {
    if (formData.province && formData.territoire) {
      const collectivites = getCollectivitesForTerritoire(formData.province, formData.territoire);
      setAvailableCollectivites(collectivites);
      
      // Réinitialiser la collectivité si elle n'est plus valide
      if (!collectivites.includes(formData.collectivite || '')) {
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableCollectivites([]);
    }
  }, [formData.province, formData.territoire]);

  // Logique de dépendance: Type de construction -> Nature de construction
  useEffect(() => {
    if (!formData.constructionType) {
      setAvailableConstructionNatures([]);
      handleInputChange('constructionNature', undefined);
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      return;
    }

    let natures: string[] = [];
    
    switch (formData.constructionType) {
      case 'Résidentielle':
      case 'Commerciale':
      case 'Industrielle':
        natures = ['Durable', 'Semi-durable', 'Précaire'];
        break;
      case 'Agricole':
        natures = ['Durable', 'Semi-durable', 'Précaire', 'Non bâti'];
        break;
      case 'Terrain nu':
        natures = ['Non bâti'];
        break;
      default:
        natures = [];
    }
    
    setAvailableConstructionNatures(natures);
    
    // Réinitialiser la nature si elle n'est plus valide
    if (formData.constructionNature && !natures.includes(formData.constructionNature)) {
      handleInputChange('constructionNature', undefined);
    }
  }, [formData.constructionType]);

  // Logique de dépendance: Type + Nature -> Usage déclaré
  useEffect(() => {
    if (!formData.constructionType || !formData.constructionNature) {
      setAvailableDeclaredUsages([]);
      handleInputChange('declaredUsage', undefined);
      return;
    }

    let usages: string[] = [];
    
    // Pour les terrains non bâtis
    if (formData.constructionNature === 'Non bâti') {
      usages = ['Terrain vacant', 'Agriculture', 'Parking'];
    }
    // Pour les constructions résidentielles
    else if (formData.constructionType === 'Résidentielle') {
      if (formData.constructionNature === 'Durable') {
        usages = ['Habitation', 'Usage mixte'];
      } else if (formData.constructionNature === 'Semi-durable') {
        usages = ['Habitation', 'Usage mixte'];
      } else if (formData.constructionNature === 'Précaire') {
        usages = ['Habitation'];
      }
    }
    // Pour les constructions commerciales
    else if (formData.constructionType === 'Commerciale') {
      if (formData.constructionNature === 'Durable') {
        usages = ['Commerce', 'Bureau', 'Usage mixte', 'Entrepôt'];
      } else if (formData.constructionNature === 'Semi-durable') {
        usages = ['Commerce', 'Bureau', 'Entrepôt'];
      } else if (formData.constructionNature === 'Précaire') {
        usages = ['Commerce'];
      }
    }
    // Pour les constructions industrielles
    else if (formData.constructionType === 'Industrielle') {
      if (formData.constructionNature === 'Durable') {
        usages = ['Industrie', 'Entrepôt'];
      } else if (formData.constructionNature === 'Semi-durable') {
        usages = ['Industrie', 'Entrepôt'];
      } else if (formData.constructionNature === 'Précaire') {
        usages = ['Industrie'];
      }
    }
    // Pour l'usage agricole
    else if (formData.constructionType === 'Agricole') {
      if (formData.constructionNature === 'Non bâti') {
        usages = ['Agriculture'];
      } else {
        usages = ['Agriculture', 'Habitation'];
      }
    }
    // Pour les terrains nus (redondant avec le premier test, mais pour la clarté)
    else if (formData.constructionType === 'Terrain nu') {
      usages = ['Terrain vacant', 'Agriculture', 'Parking'];
    }
    
    setAvailableDeclaredUsages(usages);
    
    // Réinitialiser l'usage si il n'est plus valide
    if (formData.declaredUsage && !usages.includes(formData.declaredUsage)) {
      handleInputChange('declaredUsage', undefined);
    }
  }, [formData.constructionType, formData.constructionNature]);

  const handleInputChange = (field: keyof CadastralContributionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionTypeChange = (type: 'urbaine' | 'rurale') => {
    setSectionType(type);
    
    // Réinitialiser tous les champs de localisation sauf la province
    setFormData(prev => ({
      ...prev,
      ville: undefined,
      commune: undefined,
      quartier: undefined,
      avenue: undefined,
      territoire: undefined,
      collectivite: undefined,
      groupement: undefined,
      village: undefined
    }));
    
    // Réinitialiser les listes
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
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
      // Check if we can add more title files
      if (titleDocFiles.length >= 5) {
        toast({
          title: "Limite atteinte",
          description: "Vous ne pouvez ajouter que 5 pièces jointes maximum",
          variant: "destructive"
        });
        return;
      }
      setTitleDocFiles(prev => [...prev, file]);
    }
    
    // Reset the input
    e.target.value = '';
  };

  const removeFile = (type: 'owner' | 'title', index?: number) => {
    if (type === 'owner') {
      setOwnerDocFile(null);
    } else if (index !== undefined) {
      setTitleDocFiles(prev => prev.filter((_, i) => i !== index));
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
      let titleDocUrls: string[] = [];

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

      if (titleDocFiles.length > 0) {
        for (const file of titleDocFiles) {
          const url = await uploadFile(file, 'title-documents');
          if (!url) {
            toast({
              title: "Erreur de téléchargement",
              description: "Impossible de télécharger un document de titre",
              variant: "destructive"
            });
            setUploading(false);
            return;
          }
          titleDocUrls.push(url);
        }
      }

      // Upload tax receipt files and transform data
      const taxHistoryData = await Promise.all(
        taxRecords.map(async (tax) => {
          let receiptUrl = null;
          if (tax.receiptFile) {
            receiptUrl = await uploadFile(tax.receiptFile, 'tax-receipts');
            if (!receiptUrl) {
              throw new Error('Erreur lors du téléchargement du reçu de taxe');
            }
          }
          return {
            taxYear: parseInt(tax.taxYear),
            amountUsd: parseFloat(tax.taxAmount),
            paymentStatus: tax.paymentStatus,
            paymentDate: tax.paymentDate || undefined,
            receiptUrl: receiptUrl || undefined,
            taxType: tax.taxType
          };
        })
      );

      // Upload mortgage receipt files and transform data
      const mortgageHistoryData = await Promise.all(
        mortgageRecords.map(async (mortgage) => {
          let receiptUrl = null;
          if (mortgage.receiptFile) {
            receiptUrl = await uploadFile(mortgage.receiptFile, 'mortgage-documents');
            if (!receiptUrl) {
              throw new Error('Erreur lors du téléchargement du document d\'hypothèque');
            }
          }
          return {
            mortgageAmountUsd: parseFloat(mortgage.mortgageAmount),
            durationMonths: parseInt(mortgage.duration),
            creditorName: mortgage.creditorName,
            creditorType: mortgage.creditorType,
            contractDate: mortgage.contractDate,
            mortgageStatus: mortgage.mortgageStatus,
            receiptUrl: receiptUrl || undefined
          };
        })
      );
      
      // Transform building permits data
      const buildingPermitsData = buildingPermits.length > 0 ? buildingPermits.map(permit => ({
        permitNumber: permit.permitNumber,
        issuingService: permit.issuingService,
        issueDate: permit.issueDate,
        validityMonths: parseInt(permit.validityMonths),
        administrativeStatus: permit.administrativeStatus,
        issuingServiceContact: permit.issuingServiceContact || undefined
      })) : undefined;
      
      // Transform GPS coordinates data
      const gpsCoordinatesData = gpsCoordinates.length > 0 ? gpsCoordinates.map(coord => ({
        borne: coord.borne,
        lat: parseFloat(coord.lat),
        lng: parseFloat(coord.lng)
      })) : undefined;

      // Add document URLs to form data
      const dataToSubmit = {
        ...formData,
        currentOwners: currentOwners.filter(o => o.lastName && o.firstName), // Ne garder que les propriétaires avec nom et prénom
        ownerDocumentUrl: ownerDocUrl || undefined,
        titleDocumentUrl: titleDocUrls.length > 0 ? JSON.stringify(titleDocUrls) : undefined,
        taxHistory: taxHistoryData.length > 0 ? taxHistoryData as any : undefined,
        mortgageHistory: mortgageHistoryData.length > 0 ? mortgageHistoryData as any : undefined,
        buildingPermits: buildingPermitsData,
        gpsCoordinates: gpsCoordinatesData,
      };

      const result = await submitContribution(dataToSubmit);
      
      if (result.success) {
        setShowSuccess(true);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du téléchargement",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const addPreviousOwner = () => {
    setPreviousOwners([...previousOwners, {
      name: '',
      legalStatus: '',
      startDate: '',
      endDate: '',
      mutationType: '',
      surveyDate: '',
      surveyorName: '',
      pvReferenceNumber: ''
    }]);
  };

  const removePreviousOwner = (index: number) => {
    setPreviousOwners(previousOwners.filter((_, i) => i !== index));
  };

  const updatePreviousOwner = (index: number, field: string, value: string) => {
    const updated = [...previousOwners];
    updated[index] = { ...updated[index], [field]: value };
    setPreviousOwners(updated);
  };

  // Fonctions pour gérer les propriétaires actuels
  const addCurrentOwner = () => {
    setCurrentOwners([...currentOwners, {
      lastName: '',
      middleName: '',
      firstName: '',
      legalStatus: 'Personne physique',
      since: ''
    }]);
  };

  const removeCurrentOwner = (index: number) => {
    if (currentOwners.length > 1) {
      setCurrentOwners(currentOwners.filter((_, i) => i !== index));
    }
  };

  const updateCurrentOwner = (index: number, field: string, value: string) => {
    const updated = [...currentOwners];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentOwners(updated);
  };

  // Fonctions pour gérer les taxes
  const addTaxRecord = () => {
    setTaxRecords([...taxRecords, {
      taxType: '',
      taxYear: '',
      taxAmount: '',
      paymentStatus: '',
      paymentDate: '',
      receiptFile: null
    }]);
  };

  const removeTaxRecord = (index: number) => {
    setTaxRecords(taxRecords.filter((_, i) => i !== index));
  };

  const updateTaxRecord = (index: number, field: string, value: string) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], [field]: value };
    setTaxRecords(updated);
  };

  const handleTaxFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 5 MB",
          variant: "destructive"
        });
        return;
      }
      const updated = [...taxRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setTaxRecords(updated);
    }
  };

  const removeTaxFile = (index: number) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setTaxRecords(updated);
  };

  // Fonctions pour gérer les hypothèques
  const addMortgageRecord = () => {
    setMortgageRecords([...mortgageRecords, {
      mortgageAmount: '',
      duration: '',
      creditorName: '',
      creditorType: '',
      contractDate: '',
      mortgageStatus: '',
      receiptFile: null
    }]);
  };

  const removeMortgageRecord = (index: number) => {
    setMortgageRecords(mortgageRecords.filter((_, i) => i !== index));
  };

  const updateMortgageRecord = (index: number, field: string, value: string) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], [field]: value };
    setMortgageRecords(updated);
  };

  const handleMortgageFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 5 MB",
          variant: "destructive"
        });
        return;
      }
      const updated = [...mortgageRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setMortgageRecords(updated);
    }
  };

  const removeMortgageFile = (index: number) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setMortgageRecords(updated);
  };
  
  // Fonctions pour gérer les permis de construire
  const addBuildingPermit = () => {
    setBuildingPermits([...buildingPermits, {
      permitNumber: '',
      issuingService: '',
      issueDate: '',
      validityMonths: '36',
      administrativeStatus: 'En attente',
      issuingServiceContact: ''
    }]);
  };
  
  const removeBuildingPermit = (index: number) => {
    setBuildingPermits(buildingPermits.filter((_, i) => i !== index));
  };
  
  const updateBuildingPermit = (index: number, field: string, value: string) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], [field]: value };
    setBuildingPermits(updated);
  };
  
  // Fonctions pour gérer les coordonnées GPS
  const addGPSCoordinate = () => {
    // Vérifier si le nombre de bornes n'excède pas le nombre de côtés
    const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    if (gpsCoordinates.length >= filledSides.length) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez ajouter que ${filledSides.length} borne(s) correspondant aux ${filledSides.length} côté(s) de la parcelle.`,
        variant: "destructive"
      });
      return;
    }
    
    setGpsCoordinates([...gpsCoordinates, {
      borne: `Borne ${gpsCoordinates.length + 1}`,
      lat: '',
      lng: ''
    }]);
  };
  
  const removeGPSCoordinate = (index: number) => {
    setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
  };
  
  const updateGPSCoordinate = (index: number, field: string, value: string) => {
    const updated = [...gpsCoordinates];
    updated[index] = { ...updated[index], [field]: value };
    setGpsCoordinates(updated);
  };
  
  const captureCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Capture en cours",
      description: "Récupération de votre position GPS...",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const updated = [...gpsCoordinates];
        updated[index] = {
          ...updated[index],
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        };
        setGpsCoordinates(updated);
        
        toast({
          title: "Position capturée",
          description: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
        });
      },
      (error) => {
        let errorMessage = "Impossible de récupérer votre position";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Veuillez autoriser l'accès à votre position";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position indisponible";
            break;
          case error.TIMEOUT:
            errorMessage = "La demande de position a expiré";
            break;
        }
        
        toast({
          title: "Erreur de géolocalisation",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Fonctions pour gérer les côtés de la parcelle
  const addParcelSide = () => {
    const sideNumber = parcelSides.length + 1;
    setParcelSides([...parcelSides, {
      name: `Côté ${sideNumber}`,
      length: ''
    }]);
  };

  const removeParcelSide = (index: number) => {
    if (parcelSides.length > 2) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
    }
  };

  const updateParcelSide = (index: number, field: 'name' | 'length', value: string) => {
    const updated = [...parcelSides];
    updated[index] = { ...updated[index], [field]: value };
    setParcelSides(updated);
  };


  const handleClose = () => {
    setFormData({ parcelNumber: parcelNumber, whatsappNumber: '' });
    setShowSuccess(false);
    setRequestWhatsAppNotif(false);
    setOwnerDocFile(null);
    setTitleDocFiles([]);
    setSectionType('');
    setSectionTypeAutoDetected(false);
    setPreviousOwners([]);
    setCurrentOwners([{
      lastName: '',
      middleName: '',
      firstName: '',
      legalStatus: 'Personne physique',
      since: ''
    }]);
    setTaxRecords([]);
    setMortgageRecords([]);
    setObligationType('taxes');
    setParcelSides([
      { name: 'Côté Nord', length: '' },
      { name: 'Côté Sud', length: '' },
      { name: 'Côté Est', length: '' },
      { name: 'Côté Ouest', length: '' }
    ]);
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <CheckCircle2 className="h-20 w-20 text-primary relative animate-scale-in" />
            </div>
            <DialogTitle className="text-2xl text-center font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Merci pour votre contribution !
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre contribution pour la parcelle <strong className="text-foreground">{parcelNumber}</strong> a été enregistrée.
              Elle sera vérifiée par notre équipe.
            </DialogDescription>
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 rounded-xl w-full border border-primary/20 shadow-lg backdrop-blur-sm animate-scale-in">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <p className="text-lg font-semibold text-center text-foreground mb-2">
                Contribution en cours de validation
              </p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Notre équipe examine actuellement vos informations pour garantir leur exactitude.
              </p>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Votre code CCC sera généré après approbation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Délai de validation : 24 à 48 heures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Vous serez notifié par email</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground max-w-sm">
              Consultez l'onglet "Codes CCC" de votre tableau de bord pour suivre l'état de votre contribution.
            </p>
            <Button onClick={handleClose} className="w-full shadow-lg hover:shadow-xl transition-all">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <BuildingPermitRequestDialog
        open={showPermitRequestDialog}
        onOpenChange={setShowPermitRequestDialog}
        parcelNumber={parcelNumber}
        hasExistingConstruction={formData.constructionType !== '' && formData.constructionType !== 'Terrain nu'}
      />
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="text-2xl font-semibold">Contribuer aux informations cadastrales</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Parcelle : <strong className="text-foreground font-semibold">{parcelNumber}</strong>
            <br />
            <span className="text-sm">Renseignez les informations que vous possédez sur cette parcelle.</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full px-6 pb-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 p-1 rounded-lg shadow-inner">
            <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Général
            </TabsTrigger>
            <TabsTrigger value="location" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Localisation
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Historiques
            </TabsTrigger>
            <TabsTrigger value="obligations" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Obligations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6 animate-fade-in">
            <PropertyTitleTypeSelect 
              value={formData.propertyTitleType || ''}
              onValueChange={(value) => handleInputChange('propertyTitleType', value)}
            />

            {formData.propertyTitleType && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="titleReference">
                  Numéro de référence du {formData.propertyTitleType.toLowerCase()}
                </Label>
                <InputWithPopover
                  id="titleReference"
                  placeholder={PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "Ex: XXX-123456"}
                  value={formData.titleReferenceNumber || ''}
                  onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                  helpTitle="Numéro de référence"
                  helpText={`Le numéro de référence se trouve généralement en haut de votre document. Format attendu : ${PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.reference || "XXX-123456"}`}
                />
                <p className="text-xs text-muted-foreground">
                  {PROPERTY_TITLE_TYPES.find(t => t.value === formData.propertyTitleType)?.description}
                </p>

                {/* Title document attachment */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="titleDoc">Document du titre de propriété (optionnel)</Label>
                    <span className="text-xs text-muted-foreground">
                      {titleDocFiles.length}/5 fichiers
                    </span>
                  </div>
                  
                  {/* Liste des fichiers ajoutés */}
                  {titleDocFiles.length > 0 && (
                    <div className="space-y-2">
                      {titleDocFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile('title', index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Bouton pour ajouter un fichier */}
                  {titleDocFiles.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('titleDoc')?.click()}
                      className="gap-2 hover:bg-primary/5 transition-all w-full"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter le titre de propriété
                    </Button>
                  )}
                  
                  <Input
                    id="titleDoc"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={(e) => handleFileChange(e, 'title')}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP ou PDF - Max 5 MB par fichier - Maximum 5 fichiers
                  </p>
                </div>
              </div>
            )}

            {/* Section Propriétaire(s) actuel(s) */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Propriétaire(s) actuel(s)</Label>
                  <p className="text-xs text-muted-foreground">
                    Indiquez le(s) propriétaire(s) actuel(s) de la parcelle
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCurrentOwner}
                  className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {currentOwners.map((owner, index) => (
                <div key={index} className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Propriétaire #{index + 1}</h4>
                    {currentOwners.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCurrentOwner(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Nom *</Label>
                      <Input
                        placeholder="Nom de famille"
                        value={owner.lastName}
                        onChange={(e) => updateCurrentOwner(index, 'lastName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Post-nom</Label>
                      <Input
                        placeholder="Post-nom (optionnel)"
                        value={owner.middleName}
                        onChange={(e) => updateCurrentOwner(index, 'middleName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Prénom *</Label>
                      <Input
                        placeholder="Prénom"
                        value={owner.firstName}
                        onChange={(e) => updateCurrentOwner(index, 'firstName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Statut juridique</Label>
                      <Select 
                        value={owner.legalStatus}
                        onValueChange={(value) => updateCurrentOwner(index, 'legalStatus', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personne physique">Personne physique</SelectItem>
                          <SelectItem value="Personne morale">Personne morale</SelectItem>
                          <SelectItem value="État">État</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Propriétaire depuis</Label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={owner.since}
                        onChange={(e) => updateCurrentOwner(index, 'since', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Owner document attachment */}
                  <div className="space-y-2 mt-3 pt-3 border-t">
                    <Label className="text-xs">Pièce d'identité du propriétaire (optionnel)</Label>
                    {!ownerDocFile ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('ownerDoc')?.click()}
                        className="gap-2 hover:bg-primary/5 transition-all w-full"
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter la pièce d'identité
                      </Button>
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
                    <Input
                      id="ownerDoc"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e, 'owner')}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP ou PDF - Max 5 MB
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionType">Type de construction</Label>
              <Select 
                value={formData.constructionType || ''}
                onValueChange={(value) => handleInputChange('constructionType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                  <SelectItem value="Commerciale">Commerciale</SelectItem>
                  <SelectItem value="Industrielle">Industrielle</SelectItem>
                  <SelectItem value="Agricole">Agricole</SelectItem>
                  <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionNature">Nature de construction</Label>
              <Select 
                value={formData.constructionNature || ''}
                onValueChange={(value) => handleInputChange('constructionNature', value)}
                disabled={!formData.constructionType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.constructionType 
                      ? "Sélectionner d'abord le type de construction" 
                      : "Sélectionner la nature"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableConstructionNatures.map((nature) => (
                    <SelectItem key={nature} value={nature}>{nature}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.constructionType && (
                <p className="text-xs text-muted-foreground">
                  Veuillez d'abord sélectionner le type de construction
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="declaredUsage">Usage déclaré</Label>
              <Select 
                value={formData.declaredUsage || ''}
                onValueChange={(value) => handleInputChange('declaredUsage', value)}
                disabled={!formData.constructionType || !formData.constructionNature}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.constructionType || !formData.constructionNature
                      ? "Sélectionner d'abord le type et la nature" 
                      : "Sélectionner l'usage"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableDeclaredUsages.map((usage) => (
                    <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!formData.constructionType || !formData.constructionNature) && (
                <p className="text-xs text-muted-foreground">
                  Veuillez d'abord sélectionner le type et la nature de construction
                </p>
              )}
            </div>

            
            {/* Section Permis de construire */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <Label className="text-sm font-semibold">Permis de construire (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les permis de construire si disponibles
                    </p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-muted">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm" align="start" side="top">
                      <div className="space-y-2">
                        <h4 className="font-semibold">À propos du permis de construire</h4>
                        <p className="text-muted-foreground">
                          Le permis de construire est un document administratif délivré par les services 
                          compétents (DUH, DUHDA, services municipaux) autorisant les travaux de construction, 
                          de rénovation ou d'agrandissement d'un bâtiment.
                        </p>
                        <div className="pt-2 border-t">
                          <p className="font-medium text-xs">Informations requises :</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 space-y-1">
                            <li>Numéro du permis</li>
                            <li>Service émetteur</li>
                            <li>Date de délivrance</li>
                            <li>Durée de validité (généralement 36 mois)</li>
                            <li>Statut administratif du permis</li>
                          </ul>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-1 border border-border/50 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPermitActionMode('demander');
                      setShowPermitRequestDialog(true);
                    }}
                    className={`gap-1.5 h-8 px-3 rounded-md transition-all text-xs font-medium ${
                      permitActionMode === 'demander' 
                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
                        : 'hover:bg-background/60'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Demander
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPermitActionMode('ajouter');
                      addBuildingPermit();
                    }}
                    className={`gap-1.5 h-8 px-3 rounded-md transition-all text-xs font-medium ${
                      permitActionMode === 'ajouter' 
                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90' 
                        : 'hover:bg-background/60'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter
                  </Button>
                </div>
              </div>

              <div className="relative overflow-hidden">
                <div 
                  className={`flex transition-transform duration-500 ease-in-out ${
                    permitActionMode === 'ajouter' ? '-translate-x-full' : 'translate-x-0'
                  }`}
                  style={{ width: '200%' }}
                >
                  {/* Bloc "Demander" */}
                  <div className="w-1/2 flex-shrink-0">
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                      <p className="text-sm">Aucun permis ajouté</p>
                    </div>
                  </div>
                  
                  {/* Bloc "Ajouter" */}
                  <div className="w-1/2 flex-shrink-0 pl-4">
                    {buildingPermits.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                        <p className="text-sm">Aucun permis ajouté</p>
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {buildingPermits.map((permit, index) => (
                        <div key={index} className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Permis #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBuildingPermit(index)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Numéro du permis</Label>
                          <InputWithPopover
                            placeholder="ex: PC-2024-001"
                            value={permit.permitNumber}
                            onChange={(e) => updateBuildingPermit(index, 'permitNumber', e.target.value)}
                            helpTitle="Numéro de permis"
                            helpText="Le numéro de permis de construire est un identifiant unique délivré par les services d'urbanisme. Il figure généralement en haut du document officiel du permis."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Date d'émission</Label>
                          <Input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={permit.issueDate}
                            onChange={(e) => updateBuildingPermit(index, 'issueDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <BuildingPermitIssuingServiceSelect
                          value={permit.issuingService}
                          onValueChange={(value) => updateBuildingPermit(index, 'issuingService', value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Validité (mois)</Label>
                          <Input
                            type="number"
                            placeholder="36"
                            value={permit.validityMonths}
                            onChange={(e) => updateBuildingPermit(index, 'validityMonths', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Statut administratif</Label>
                          <Select
                            value={permit.administrativeStatus}
                            onValueChange={(value) => updateBuildingPermit(index, 'administrativeStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="Conforme">Conforme</SelectItem>
                              <SelectItem value="Non autorisé">Non autorisé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6 mt-6 animate-fade-in">
            {/* Choix du type de section */}
            <div className="space-y-2 pb-4 border-t">
              <Label htmlFor="sectionType">Type de section *</Label>
              <Select 
                value={sectionType} 
                onValueChange={(value: 'urbaine' | 'rurale') => handleSectionTypeChange(value)}
                disabled={sectionTypeAutoDetected}
              >
                <SelectTrigger className={sectionTypeAutoDetected ? 'bg-muted/50 cursor-not-allowed' : ''}>
                  <SelectValue placeholder="Choisir le type de section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urbaine">Section Urbaine (SU)</SelectItem>
                  <SelectItem value="rurale">Section rurale (SR)</SelectItem>
                </SelectContent>
              </Select>
              {sectionTypeAutoDetected ? (
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Type détecté automatiquement à partir du préfixe "{parcelNumber.toUpperCase().startsWith('SU') ? 'SU' : 'SR'}"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choisissez si vous renseignez un numéro SU (zone urbaine) ou SR (zone rurale)
                </p>
              )}
            </div>

            {/* Province - toujours visible */}
            {sectionType && (
              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Select 
                  value={formData.province} 
                  onValueChange={(value) => handleInputChange('province', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la province" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllProvinces().map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Section Urbaine (SU) - visible uniquement si type urbain sélectionné */}
            {sectionType === 'urbaine' && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">Section Urbaine (SU)</h4>
                <p className="text-xs text-muted-foreground">
                  Remplissez ces champs pour les zones urbaines (numéro SU).
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Select 
                    value={formData.ville}
                    onValueChange={(value) => handleInputChange('ville', value)}
                    disabled={!formData.province || availableVilles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.province 
                        ? "Sélectionner d'abord une province" 
                        : availableVilles.length === 0 
                        ? "Aucune ville disponible"
                        : "Sélectionner la ville"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVilles.map(ville => (
                        <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commune">Commune</Label>
                  <Select 
                    value={formData.commune}
                    onValueChange={(value) => handleInputChange('commune', value)}
                    disabled={!formData.ville || availableCommunes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.ville 
                        ? "Sélectionner d'abord une ville" 
                        : availableCommunes.length === 0 
                        ? "Aucune commune disponible"
                        : "Sélectionner la commune"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCommunes.map(commune => (
                        <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quartier">Quartier</Label>
                  <Select 
                    value={formData.quartier}
                    onValueChange={(value) => handleInputChange('quartier', value)}
                    disabled={!formData.commune || availableQuartiers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.commune 
                        ? "Sélectionner d'abord une commune" 
                        : availableQuartiers.length === 0 
                        ? "Aucun quartier disponible - saisie manuelle possible"
                        : "Sélectionner le quartier"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuartiers.map(quartier => (
                        <SelectItem key={quartier} value={quartier}>{quartier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableQuartiers.length === 0 && formData.commune && (
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Saisir le nom du quartier"
                        value={formData.quartier || ''}
                        onChange={(e) => handleInputChange('quartier', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Aucun quartier prédéfini - saisie manuelle</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avenue">Avenue</Label>
                  <Select 
                    value={formData.avenue}
                    onValueChange={(value) => handleInputChange('avenue', value)}
                    disabled={!formData.quartier || availableAvenues.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.quartier 
                        ? "Sélectionner d'abord un quartier" 
                        : availableAvenues.length === 0 
                        ? "Aucune avenue disponible - saisie manuelle possible"
                        : "Sélectionner l'avenue"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAvenues.map(avenue => (
                        <SelectItem key={avenue} value={avenue}>{avenue}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableAvenues.length === 0 && formData.quartier && (
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Saisir le nom de l'avenue"
                        value={formData.avenue || ''}
                        onChange={(e) => handleInputChange('avenue', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Aucune avenue prédéfinie - saisie manuelle</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Rurale (SR) - visible uniquement si type rural sélectionné */}
            {sectionType === 'rurale' && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">Section rurale (SR)</h4>
                <p className="text-xs text-muted-foreground">
                  Remplissez ces champs pour les zones rurales (numéro SR).
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="territoire">Territoire</Label>
                  <Select 
                    value={formData.territoire}
                    onValueChange={(value) => handleInputChange('territoire', value)}
                    disabled={!formData.province || availableTerritoires.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.province 
                        ? "Sélectionner d'abord une province" 
                        : availableTerritoires.length === 0 
                        ? "Aucun territoire disponible"
                        : "Sélectionner le territoire"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerritoires.map(territoire => (
                        <SelectItem key={territoire} value={territoire}>{territoire}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collectivite">Collectivité</Label>
                  <Select 
                    value={formData.collectivite}
                    onValueChange={(value) => handleInputChange('collectivite', value)}
                    disabled={!formData.territoire || availableCollectivites.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.territoire 
                        ? "Sélectionner d'abord un territoire" 
                        : availableCollectivites.length === 0 
                        ? "Aucune collectivité disponible"
                        : "Sélectionner la collectivité"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCollectivites.map(collectivite => (
                        <SelectItem key={collectivite} value={collectivite}>{collectivite}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupement">Groupement</Label>
                  <Input
                    id="groupement"
                    placeholder="ex: Katoyi"
                    value={formData.groupement || ''}
                    onChange={(e) => handleInputChange('groupement', e.target.value)}
                    disabled={!formData.collectivite}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.collectivite ? "Sélectionner d'abord une collectivité" : "Saisie manuelle - optionnel"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="village">Village</Label>
                  <Input
                    id="village"
                    placeholder="ex: Mushaki"
                    value={formData.village || ''}
                    onChange={(e) => handleInputChange('village', e.target.value)}
                    disabled={!formData.collectivite}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.collectivite ? "Sélectionner d'abord une collectivité" : "Saisie manuelle - optionnel"}
                  </p>
                </div>
              </div>
            )}

            {/* Dimensions de la parcelle et calcul de la superficie */}
            {sectionType && (
              <div className="space-y-2 pt-4 border-t">
                <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border border-border/50">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Dimensions de chaque côté (en mètres)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les dimensions de chaque côté de la parcelle
                    </p>
                  </div>

                  <div className="space-y-2">
                    {parcelSides.map((side, index) => (
                      <div key={index} className="flex items-center gap-2 animate-fade-in">
                        <Input
                          placeholder="Nom du côté"
                          value={side.name}
                          onChange={(e) => updateParcelSide(index, 'name', e.target.value)}
                          className="flex-1 transition-all focus:scale-[1.01]"
                        />
                        <Input
                          type="number"
                          placeholder="Longueur"
                          value={side.length}
                          onChange={(e) => updateParcelSide(index, 'length', e.target.value)}
                          className="w-32 transition-all focus:scale-[1.01]"
                        />
                        <span className="text-xs text-muted-foreground w-6">m</span>
                        {parcelSides.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParcelSide(index)}
                            className="hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addParcelSide}
                    className="w-full hover:bg-primary/5 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un côté
                  </Button>

                  {formData.areaSqm && (
                    <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 animate-scale-in">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Superficie calculée
                      </p>
                      <p className="text-3xl font-bold text-primary mb-2">{formData.areaSqm} m²</p>
                      <p className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md inline-block">
                        {parcelSides.length === 2 && "Calcul rectangulaire simple"}
                        {parcelSides.length === 4 && "Calcul rectangulaire (4 côtés)"}
                        {parcelSides.length > 4 && "Approximation basée sur les dimensions"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Coordonnées GPS des bornes */}
            {sectionType && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold">Coordonnées GPS des bornes (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les coordonnées GPS de chaque borne du terrain
                    </p>
                    {(() => {
                      const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
                      const isSuperficieCompleted = filledSides.length >= 3;
                      const canAddMore = gpsCoordinates.length < filledSides.length;
                      
                      if (!isSuperficieCompleted) {
                        return (
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Complétez d'abord le bloc "Dimensions de chaque côté" (au moins 3 côtés)
                          </p>
                        );
                      }
                      
                      if (!canAddMore && gpsCoordinates.length > 0) {
                        return (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Limite atteinte : {filledSides.length} borne(s) pour {filledSides.length} côté(s)
                          </p>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGPSCoordinate}
                    disabled={(() => {
                      const filledSides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
                      const isSuperficieCompleted = filledSides.length >= 3;
                      const canAddMore = gpsCoordinates.length < filledSides.length;
                      return !isSuperficieCompleted || !canAddMore;
                    })()}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {gpsCoordinates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                    <p className="text-sm">Aucune coordonnée GPS ajoutée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gpsCoordinates.map((coord, index) => (
                      <div key={index} className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="flex items-center justify-between">
                          <Input
                            placeholder="Nom de la borne"
                            value={coord.borne}
                            onChange={(e) => updateGPSCoordinate(index, 'borne', e.target.value)}
                            className="flex-1 mr-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGPSCoordinate(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Latitude</Label>
                                <InputWithPopover
                                  type="number"
                                  step="0.000001"
                                  placeholder="ex: -1.674"
                                  value={coord.lat}
                                  onChange={(e) => updateGPSCoordinate(index, 'lat', e.target.value)}
                                  helpTitle="Latitude"
                                  helpText="La latitude représente la position nord-sud. Au Congo, les valeurs sont généralement négatives (entre -13° et 5°). Vous pouvez utiliser votre smartphone ou un GPS pour obtenir cette coordonnée précise."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Longitude</Label>
                                <InputWithPopover
                                  type="number"
                                  step="0.000001"
                                  placeholder="ex: 29.224"
                                  value={coord.lng}
                                  onChange={(e) => updateGPSCoordinate(index, 'lng', e.target.value)}
                                  helpTitle="Longitude"
                                  helpText="La longitude représente la position est-ouest. Au Congo, les valeurs sont généralement positives (entre 12° et 31°). Assurez-vous d'utiliser au moins 6 décimales pour une précision optimale."
                                />
                              </div>
                            </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => captureCurrentLocation(index)}
                            className="w-full gap-2 hover:bg-primary/10 transition-all"
                          >
                            <MapPin className="h-4 w-4" />
                            Capturer ma position actuelle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Historique de propriété (optionnel)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez les anciens propriétaires que vous connaissez
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPreviousOwner}
                  className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {previousOwners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 animate-fade-in">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Aucun ancien propriétaire ajouté</p>
                    <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {previousOwners.map((owner, index) => (
                    <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Propriétaire #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreviousOwner(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                       <div className="space-y-2">
                        <Label>Nom de l'ancien propriétaire</Label>
                        <InputWithPopover
                          placeholder="ex: Jean Mukendi"
                          value={owner.name}
                          onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)}
                          helpTitle="Ancien propriétaire"
                          helpText="Indiquez le nom complet de l'ancien propriétaire tel qu'il figurait sur les documents officiels. Cette information aide à retracer l'historique de la propriété."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Statut juridique</Label>
                        <Select
                          value={owner.legalStatus}
                          onValueChange={(value) => updatePreviousOwner(index, 'legalStatus', value)}
                        >
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
                          <Label>Date début</Label>
                          <Input
                            type="date"
                            max={currentOwners[0]?.since || new Date().toISOString().split('T')[0]}
                            value={owner.startDate}
                            onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                          />
                          {owner.startDate && owner.endDate && owner.startDate > owner.endDate && (
                            <p className="text-xs text-destructive">La date de début doit être avant la date de fin</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Date fin</Label>
                          <Input
                            type="date"
                            min={owner.startDate || undefined}
                            max={currentOwners[0]?.since || new Date().toISOString().split('T')[0]}
                            value={owner.endDate}
                            onChange={(e) => updatePreviousOwner(index, 'endDate', e.target.value)}
                          />
                          {owner.endDate && currentOwners[0]?.since && owner.endDate > currentOwners[0].since && (
                            <p className="text-xs text-destructive">La date de fin doit être avant la date du propriétaire actuel</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Type de mutation</Label>
                        <Select
                          value={owner.mutationType}
                          onValueChange={(value) => updatePreviousOwner(index, 'mutationType', value)}
                        >
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

                      {/* Informations de bornage intégrées */}
                      <div className="pt-3 border-t space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground">Bornage (optionnel)</Label>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Numéro de référence du PV</Label>
                          <InputWithPopover
                            placeholder="ex: PV/2024/001"
                            value={owner.pvReferenceNumber || ''}
                            onChange={(e) => updatePreviousOwner(index, 'pvReferenceNumber', e.target.value)}
                            helpTitle="Numéro du PV de bornage"
                            helpText="Le procès-verbal (PV) de bornage est un document officiel établi par un géomètre. Son numéro de référence se trouve généralement en en-tête du document et permet de l'identifier de façon unique."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Date du bornage</Label>
                          <Input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={owner.surveyDate || ''}
                            onChange={(e) => updatePreviousOwner(index, 'surveyDate', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Nom du géomètre</Label>
                          <InputWithPopover
                            placeholder="ex: Géomètre Kalala"
                            value={owner.surveyorName || ''}
                            onChange={(e) => updatePreviousOwner(index, 'surveyorName', e.target.value)}
                            helpTitle="Géomètre"
                            helpText="Indiquez le nom du géomètre agréé qui a effectué le bornage de la parcelle. Cette information se trouve généralement sur le procès-verbal de bornage avec le numéro d'agrément du géomètre."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-6 mt-6 animate-fade-in">
            {/* Switch Taxes/Hypothèques redesigné */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit shadow-inner">
              <Button
                type="button"
                variant={obligationType === 'taxes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('taxes')}
                className="transition-all hover:scale-105 shadow-sm"
              >
                Taxes
              </Button>
              <Button
                type="button"
                variant={obligationType === 'mortgages' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('mortgages')}
                className="transition-all hover:scale-105 shadow-sm"
              >
                Hypothèques
              </Button>
            </div>

            {/* Section Taxes */}
            {obligationType === 'taxes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Historique des taxes (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les taxes que vous connaissez pour cette parcelle
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTaxRecord}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {taxRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 animate-fade-in">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Aucune taxe ajoutée</p>
                      <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {taxRecords.map((tax, index) => (
                      <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Taxe #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTaxRecord(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Type de taxe</Label>
                          <Select
                            value={tax.taxType}
                            onValueChange={(value) => updateTaxRecord(index, 'taxType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type de taxe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Impôt foncier annuel">Impôt foncier annuel</SelectItem>
                              <SelectItem value="Impôt sur les revenus locatifs">Impôt sur les revenus locatifs</SelectItem>
                              <SelectItem value="Taxe de superficie">Taxe de superficie</SelectItem>
                              <SelectItem value="Taxe de plus-value immobilière">Taxe de plus-value immobilière</SelectItem>
                              <SelectItem value="Taxe d'habitation">Taxe d'habitation</SelectItem>
                              <SelectItem value="Autre taxe">Autre taxe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Année fiscale</Label>
                          <Select
                            value={tax.taxYear}
                            onValueChange={(value) => updateTaxRecord(index, 'taxYear', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'année" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Années fiscales valides uniquement</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Montant payé (USD)</Label>
                          <InputWithPopover
                            type="number"
                            placeholder="ex: 150"
                            value={tax.taxAmount}
                            onChange={(e) => updateTaxRecord(index, 'taxAmount', e.target.value)}
                            helpTitle="Montant de la taxe"
                            helpText="Indiquez le montant total payé pour cette taxe en dollars américains. Ce montant devrait correspondre à celui indiqué sur votre reçu de paiement officiel."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Statut de paiement</Label>
                          <Select
                            value={tax.paymentStatus}
                            onValueChange={(value) => updateTaxRecord(index, 'paymentStatus', value)}
                          >
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
                          <Label>Date de paiement</Label>
                          <InputWithPopover
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={tax.paymentDate}
                            onChange={(e) => updateTaxRecord(index, 'paymentDate', e.target.value)}
                            helpTitle="Date de paiement"
                            helpText="Indiquez la date exacte à laquelle vous avez effectué le paiement de cette taxe. Cette date doit correspondre à celle figurant sur votre reçu officiel."
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        {/* Pièce jointe pour la taxe */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Pièce justificative (optionnel)</Label>
                          {!tax.receiptFile ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                onChange={(e) => handleTaxFileChange(index, e)}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{tax.receiptFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTaxFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Reçu de paiement (JPG, PNG, WEBP ou PDF - Max 5 MB)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section Hypothèques */}
            {obligationType === 'mortgages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Hypothèque (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les hypothèques que vous connaissez pour cette parcelle
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMortgageRecord}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {mortgageRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 animate-fade-in">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Aucune hypothèque ajoutée</p>
                      <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {mortgageRecords.map((mortgage, index) => (
                      <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Hypothèque #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMortgageRecord(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Montant de l'hypothèque (USD)</Label>
                          <InputWithPopover
                            type="number"
                            placeholder="ex: 50000"
                            value={mortgage.mortgageAmount}
                            onChange={(e) => updateMortgageRecord(index, 'mortgageAmount', e.target.value)}
                            helpTitle="Montant de l'hypothèque"
                            helpText="Indiquez le montant total de l'hypothèque en dollars américains. Il s'agit du capital emprunté garanti par la parcelle, tel qu'indiqué dans le contrat d'hypothèque."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Durée (mois)</Label>
                          <InputWithPopover
                            type="number"
                            placeholder="ex: 120"
                            value={mortgage.duration}
                            onChange={(e) => updateMortgageRecord(index, 'duration', e.target.value)}
                            helpTitle="Durée de l'hypothèque"
                            helpText="Indiquez la durée totale de l'hypothèque en mois. Par exemple, pour un prêt de 10 ans, saisissez 120 mois. Cette information figure dans votre contrat d'hypothèque."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nom du créancier</Label>
                          <InputWithPopover
                            placeholder="ex: Banque XYZ"
                            value={mortgage.creditorName}
                            onChange={(e) => updateMortgageRecord(index, 'creditorName', e.target.value)}
                            helpTitle="Créancier"
                            helpText="Indiquez le nom complet de l'institution financière ou de la personne qui a accordé l'hypothèque. Ce nom doit correspondre exactement à celui figurant sur le contrat d'hypothèque."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Type de créancier</Label>
                          <Select
                            value={mortgage.creditorType}
                            onValueChange={(value) => updateMortgageRecord(index, 'creditorType', value)}
                          >
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
                          <Label>Date du contrat</Label>
                          <InputWithPopover
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={mortgage.contractDate}
                            onChange={(e) => updateMortgageRecord(index, 'contractDate', e.target.value)}
                            helpTitle="Date du contrat"
                            helpText="Indiquez la date de signature du contrat d'hypothèque. Cette date marque le début de l'engagement hypothécaire sur la parcelle."
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Statut de l'hypothèque</Label>
                          <Select
                            value={mortgage.mortgageStatus}
                            onValueChange={(value) => updateMortgageRecord(index, 'mortgageStatus', value)}
                          >
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

                        {/* Pièce jointe pour l'hypothèque */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Pièce justificative (optionnel)</Label>
                          {!mortgage.receiptFile ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                onChange={(e) => handleMortgageFileChange(index, e)}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{mortgage.receiptFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMortgageFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Contrat ou justificatif (JPG, PNG, WEBP ou PDF - Max 5 MB)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center space-x-3 px-6 py-4 border-t bg-muted/20">
          <Checkbox 
            id="whatsapp" 
            checked={requestWhatsAppNotif}
            onCheckedChange={(checked) => setRequestWhatsAppNotif(checked as boolean)}
            className="transition-all"
          />
          <Label htmlFor="whatsapp" className="text-sm cursor-pointer hover:text-primary transition-colors">
            M'informer par WhatsApp si les informations sont validées
          </Label>
        </div>

        {requestWhatsAppNotif && (
          <div className="px-6 pb-4 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number" className="text-sm font-medium">Numéro WhatsApp</Label>
              <Input
                id="whatsapp-number"
                placeholder="+243 XXX XXX XXX"
                value={formData.whatsappNumber || ''}
                onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                className="transition-all focus:scale-[1.01]"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 px-6 pb-6">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading} 
            className="flex-1 h-12 hover:bg-muted transition-all hover:scale-[1.02]"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || uploading} 
            className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            {(loading || uploading) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {uploading ? 'Téléchargement...' : 'Soumettre la contribution'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default CadastralContributionDialog;
