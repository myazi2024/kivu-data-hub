import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Tag } from 'lucide-react';
import { useDiscountCodes } from '@/hooks/useDiscountCodes';
import { useToast } from '@/hooks/use-toast';

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
  
  const { validateDiscountCode } = useDiscountCodes();
  const { toast } = useToast();

  const handleValidateCode = async () => {
    if (!code.trim()) return;

    try {
      setValidating(true);
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
    <div className={`space-y-1 sm:space-y-3 p-1 sm:p-3 border border-dashed border-primary/30 rounded-md pulse ${className}`}>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        <span className="text-xs sm:text-sm font-medium">Code de remise (optionnel)</span>
      </div>
      
      <div className="flex space-x-1 sm:space-x-2">
        <Input
          type="text"
          placeholder="BIC-RV001"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          className="uppercase text-xs sm:text-sm h-8 sm:h-11 animate-pulse"
          disabled={validating}
        />
        <Button
          variant="outline"
          onClick={handleValidateCode}
          disabled={!code.trim() || validating}
          className="whitespace-nowrap text-xs sm:text-sm h-8 sm:h-11 px-2 sm:px-4"
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