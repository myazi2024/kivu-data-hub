import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Tag } from 'lucide-react';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useToast } from '@/hooks/use-toast';

const PLACEHOLDER_EXAMPLES = ['BIC-RV001', 'PROMO2024', 'REMISE50'];

interface DiscountCodeInputProps {
  invoiceAmount: number;
  onDiscountApplied: (discount: {
    code: string;
    amount: number;
    reseller_id: string;
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
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    reseller_id: string;
    code_id: string;
  } | null>(null);
  
  // Animation placeholder de type machine à écrire
  const [placeholderText, setPlaceholderText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  
  const { validateDiscountCode } = useDiscountCodes();
  const { toast } = useToast();

  // Animation du placeholder
  useEffect(() => {
    if (code.length > 0) {
      // Arrêter l'animation si l'utilisateur tape
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
      const validation = await validateDiscountCode(code.trim().toUpperCase(), invoiceAmount);
      
      console.log('Validation result:', validation);
      
      if (validation?.is_valid) {
        const discount = {
          code: code.trim().toUpperCase(),
          amount: validation.discount_amount,
          reseller_id: validation.reseller_id || '',
          code_id: validation.code_id || ''
        };
        
        console.log('Applying discount:', discount);
        
        setAppliedDiscount(discount);
        onDiscountApplied(discount);
        
        toast({
          title: "Code appliqué",
          description: `Remise de ${validation.discount_amount.toFixed(2)} USD appliquée`
        });
      } else {
        console.log('Code validation failed:', validation);
        toast({
          title: "Code invalide",
          description: "Ce code de remise n'est pas valide ou a expiré",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error validating discount code:', error);
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
    <div className={`space-y-1 sm:space-y-3 p-1 sm:p-3 border border-dashed border-primary/30 rounded-md ${className}`}>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <span className="text-xs sm:text-sm font-medium">Code de remise (optionnel)</span>
      </div>
      
      <div className="flex space-x-1 sm:space-x-2">
        <Input
          type="text"
          placeholder={placeholderText}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          className="uppercase text-xs sm:text-sm h-8 sm:h-11"
          disabled={validating}
        />
        <Button
          onClick={handleValidateCode}
          disabled={!code.trim() || validating}
          className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-11 px-2 sm:px-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-300 ease-out shadow-elegant hover:shadow-hover hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 text-primary-foreground font-medium"
        >
          {validating ? (
            <>
              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              <span className="hidden sm:inline">Vérification...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            'Appliquer'
          )}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Saisissez un code de remise valide pour bénéficier d'une réduction
      </p>
    </div>
  );
};

export default DiscountCodeInput;