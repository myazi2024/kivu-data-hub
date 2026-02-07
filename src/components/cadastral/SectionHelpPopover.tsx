import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';

interface SectionHelpPopoverProps {
  title: string;
  description: string;
  /** Optional icon to show in the popover header */
  icon?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

const SectionHelpPopover: React.FC<SectionHelpPopoverProps> = ({ 
  title, 
  description, 
  icon,
  align = 'start' 
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
          aria-label={`Aide: ${title}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 rounded-xl text-xs z-[1300]" 
        align={align} 
        sideOffset={5}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            {icon}
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SectionHelpPopover;
