import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, Tag, Gift, ExternalLink } from 'lucide-react';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useCadastralContribution } from '@/hooks/useCadastralContribution';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

import { useCatalogConfig } from '@/hooks/useCatalogConfig';

interface DiscountCodeInputProps {
  invoiceAmount: number;
  onDiscountApplied: (discount: {
    code: string;
    amount: number;
    reseller_id: string | null;
    code_id: string;
  } | null) => void;
  className?: string;
}

const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({
  invoiceAmount,
  onDiscountApplied,
  className = ""
}) => {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [codeType, setCodeType] = useState<'discount' | 'ccc'>('discount');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    reseller_id: string | null;
    code_id: string;
  } | null>(null);
  
  // Animation placeholder de type machine à écrire
  const [placeholderText, setPlaceholderText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  
  const { validateDiscountCode } = useDiscountCodes();
  const { validateCCCCode } = useCadastralContribution();
  const { toast } = useToast();
  const { config: catalogConfig } = useCatalogConfig();
  
  const PLACEHOLDER_EXAMPLES = catalogConfig.discount_code_placeholders;

  // Fix #18: Animation placeholder conditionnelle — ne tourne que si le composant est visible (pas de code saisi)
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Observer la visibilité pour stopper l'animation quand le composant n'est pas affiché
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Ne pas animer si invisible ou si l'utilisateur tape
    if (code.length > 0 || !isVisible) {
      setPlaceholderText('');
      return;
    }
    
    const currentExample = PLACEHOLDER_EXAMPLES[currentExampleIndex];
    
    if (isTyping) {
      if (placeholderText.length < currentExample.length) {
        const timeout = setTimeout(() => {
          setPlaceholderText(currentExample.slice(0, placeholderText.length + 1));
        }, 150);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (placeholderText.length > 0) {
        const timeout = setTimeout(() => {
          setPlaceholderText(placeholderText.slice(0, -1));
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setCurrentExampleIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
          setIsTyping(true);
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [placeholderText, isTyping, currentExampleIndex, code, isVisible]);

  const handleValidateCode = async () => {
    if (!code.trim()) return;

    try {
      setValidating(true);

      if (codeType === 'ccc') {
        // Validation du code CCC
        const validation = await validateCCCCode(code.trim().toUpperCase(), invoiceAmount);
        
        if (validation && validation.is_valid) {
          const discount = {
            code: code.trim().toUpperCase(),
            amount: validation.discount_amount,
            reseller_id: null,
            code_id: validation.code_id
          };
          
          setAppliedDiscount(discount);
          onDiscountApplied(discount);
          
          toast({
            title: "Code CCC appliqué",
            description: `Remise de ${validation.discount_amount.toFixed(2)} USD appliquée`
          });
        } else {
          toast({
            title: "Code invalide",
            description: validation?.message || "Ce code CCC n'est pas valide ou a expiré",
            variant: "destructive"
          });
        }
      } else {
        // Validation du code de remise classique
        const validation = await validateDiscountCode(code.trim().toUpperCase(), invoiceAmount);
        
        if (validation?.is_valid && validation.reseller_id && validation.code_id) {
          const discount = {
            code: code.trim().toUpperCase(),
            amount: validation.discount_amount,
            reseller_id: validation.reseller_id,
            code_id: validation.code_id
          };
          
          setAppliedDiscount(discount);
          onDiscountApplied(discount);
          
          toast({
            title: "Code appliqué",
            description: `Remise de ${validation.discount_amount.toFixed(2)} USD appliquée`
          });
        } else {
          toast({
            title: "Code invalide",
            description: "Ce code de remise n'est pas valide ou a expiré",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error validating code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider le code",
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveDiscount = () => {
    setCode('');
    setAppliedDiscount(null);
    onDiscountApplied(null);
    
    toast({
      title: "Remise supprimée",
      description: "Le code de remise a été retiré"
    });
  };

  if (appliedDiscount) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-center space-x-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Code appliqué : {appliedDiscount.code}
            </span>
            <Badge variant="outline" className="text-green-700 border-green-300">
              -{appliedDiscount.amount.toFixed(2)} USD
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveDiscount}
            className="text-green-700 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`space-y-4 p-4 border border-dashed border-primary/30 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Codes de réduction (optionnel)</span>
        </div>
      </div>

      <Tabs 
        value={codeType} 
        onValueChange={(value) => {
          setCodeType(value as 'discount' | 'ccc');
          setCode('');
          setPlaceholderText('');
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discount" className="text-xs sm:text-sm">
            <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Code de remise
          </TabsTrigger>
          <TabsTrigger value="ccc" className="text-xs sm:text-sm">
            <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Code CCC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discount" className="space-y-3 mt-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder={placeholderText || "Ex: BIC-RV001"}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
              className="uppercase text-sm"
              disabled={validating}
            />
            <Button
              onClick={handleValidateCode}
              disabled={!code.trim() || validating}
              className="whitespace-nowrap"
            >
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Vérification...</span>
                </>
              ) : (
                'Appliquer'
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Saisissez un code de remise pour bénéficier d'une réduction.</p>
            <Link 
              to="/about-discount-codes" 
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              En savoir plus sur les codes de remise
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="ccc" className="space-y-3 mt-4">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="CCC-XXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
              className="uppercase text-sm"
              disabled={validating}
            />
            <Button
              onClick={handleValidateCode}
              disabled={!code.trim() || validating}
              className="whitespace-nowrap"
            >
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Vérification...</span>
                </>
              ) : (
                'Appliquer'
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Codes CCC : 5 USD de réduction, valables 90 jours.</p>
            <Link 
              to="/about-ccc" 
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Comment obtenir un Code Contributeur Cadastral ?
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiscountCodeInput;
