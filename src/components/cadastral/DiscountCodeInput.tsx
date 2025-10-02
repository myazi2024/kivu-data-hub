import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, Tag } from 'lucide-react';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useCadastralContribution } from '@/hooks/useCadastralContribution';
import { useToast } from '@/hooks/use-toast';

const PLACEHOLDER_EXAMPLES = ['BIC-RV001', 'PROMO2024', 'REMISE50'];

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
  const [useCCC, setUseCCC] = useState(false);
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

  // Animation du placeholder
  useEffect(() => {
    if (code.length > 0) {
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
  }, [placeholderText, isTyping, currentExampleIndex, code]);

  const handleValidateCode = async () => {
    if (!code.trim()) return;

    try {
      setValidating(true);

      if (useCCC) {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidateCode();
    }
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
    <div className={`space-y-3 p-3 border border-dashed border-primary/30 rounded-md ${className}`}>
      <div className="flex items-center space-x-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Code de remise (optionnel)</span>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="use-ccc" 
          checked={useCCC}
          onCheckedChange={(checked) => {
            setUseCCC(checked as boolean);
            setCode('');
            setPlaceholderText('');
          }}
        />
        <Label htmlFor="use-ccc" className="text-sm cursor-pointer font-normal">
          Utiliser un Code Contributeur Cadastral (CCC)
        </Label>
      </div>
      
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder={useCCC ? "CCC-XXXXX" : placeholderText}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
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
              Vérification...
            </>
          ) : (
            'Appliquer'
          )}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {useCCC 
          ? "Les codes CCC ont une valeur de 5 USD et sont valables 90 jours"
          : "Saisissez un code de remise valide pour bénéficier d'une réduction"
        }
      </p>
    </div>
  );
};

export default DiscountCodeInput;
