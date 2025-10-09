import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InfoIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface InputWithPopoverProps extends React.ComponentPropsWithoutRef<typeof Input> {
  helpText: string;
  helpTitle?: string;
}

export const InputWithPopover: React.FC<InputWithPopoverProps> = ({ 
  helpText, 
  helpTitle = "Aide",
  ...inputProps 
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Nettoyer le timer quand le composant est démonté
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(true);
    
    // Démarrer le timer de 5 secondes
    timerRef.current = setTimeout(() => {
      setOpen(true);
    }, 5000);

    // Appeler l'onFocus original si présent
    if (inputProps.onFocus) {
      inputProps.onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(false);
    setOpen(false);
    
    // Annuler le timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Appeler l'onBlur original si présent
    if (inputProps.onBlur) {
      inputProps.onBlur(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Dès que l'utilisateur commence à écrire, fermer le popover et annuler le timer
    setOpen(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Appeler l'onChange original
    if (inputProps.onChange) {
      inputProps.onChange(e);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            {...inputProps}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        side={isMobile ? "top" : "right"} 
        align={isMobile ? "center" : "start"}
        className={`animate-in fade-in-0 zoom-in-95 duration-300 ${
          isMobile 
            ? 'w-[calc(100vw-3rem)] max-w-sm slide-in-from-bottom-2' 
            : 'w-72 slide-in-from-left-2'
        }`}
        sideOffset={isMobile ? 8 : 4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className={isMobile ? "space-y-1.5" : "space-y-2"}>
          <div className="flex items-center gap-2">
            <InfoIcon className={isMobile ? "h-3.5 w-3.5 text-primary flex-shrink-0" : "h-4 w-4 text-primary"} />
            <h4 className={`font-semibold ${isMobile ? "text-xs" : "text-sm"}`}>{helpTitle}</h4>
          </div>
          <p className={`text-muted-foreground leading-relaxed ${isMobile ? "text-xs" : "text-sm"}`}>
            {helpText}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
