import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Smartphone } from 'lucide-react';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  onDisabledClick?: () => void;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  placeholder = "97 123 4567",
  required = false,
  className = "",
  disabled = false,
  onDisabledClick
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Animation typewriter pour le placeholder
  useEffect(() => {
    if (!value && !isTyping && !disabled) {
      let timeoutId: NodeJS.Timeout;
      
      const animatePlaceholder = () => {
        setIsTyping(true);
        let currentIndex = 0;
        
        const typeChar = () => {
          if (currentIndex <= placeholder.length) {
            setDisplayValue(placeholder.slice(0, currentIndex));
            currentIndex++;
            timeoutId = setTimeout(typeChar, 80);
          } else {
            // Pause puis effacement
            timeoutId = setTimeout(() => {
              const eraseChar = () => {
                if (currentIndex > 0) {
                  currentIndex--;
                  setDisplayValue(placeholder.slice(0, currentIndex));
                  timeoutId = setTimeout(eraseChar, 50);
                } else {
                  setIsTyping(false);
                  // Reprendre l'animation après une pause
                  timeoutId = setTimeout(animatePlaceholder, 2000);
                }
              };
              eraseChar();
            }, 1500);
          }
        };
        
        typeChar();
      };
      
      // Démarrer l'animation après une petite pause
      timeoutId = setTimeout(animatePlaceholder, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [value, placeholder, isTyping, disabled]);

  // Curseur clignotant
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    
    return () => clearInterval(cursorInterval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const inputValue = e.target.value;
    // Nettoyer et formater le numéro (garder seulement les chiffres et espaces)
    const cleanValue = inputValue.replace(/[^\d\s]/g, '');
    onChange(cleanValue);
    setDisplayValue('');
  };

  const handleClick = () => {
    if (disabled && onDisabledClick) {
      onDisabledClick();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Code géographique fixe */}
      <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2.5 rounded-lg border border-border/20 min-w-fit">
        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">+243</span>
      </div>
      
      {/* Champ numéro avec animation */}
      <div className="flex-1 relative">
        <Input
          type="tel"
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          onClick={handleClick}
          className={`h-10 border-border/20 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary ${
            disabled 
              ? 'bg-muted/30 cursor-not-allowed opacity-60' 
              : 'bg-background/50 hover:bg-background/80'
          } ${className}`}
          onFocus={() => !disabled && setDisplayValue('')}
        />
        
        {/* Placeholder animé */}
        {!value && !disabled && (
          <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
            <span className="text-muted-foreground text-sm">
              {displayValue}
              {!value && (
                <span 
                  className={`inline-block w-0.5 h-4 bg-muted-foreground ml-0.5 ${
                    showCursor ? 'opacity-100' : 'opacity-0'
                  } transition-opacity duration-100`}
                />
              )}
            </span>
          </div>
        )}
        
        {/* Placeholder statique quand disabled */}
        {!value && disabled && (
          <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
            <span className="text-muted-foreground/50 text-sm">
              Sélectionnez d'abord un fournisseur
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneNumberInput;