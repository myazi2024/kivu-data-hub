import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FormFieldWrapperProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  tooltip?: string;
  htmlFor?: string;
  className?: string;
  highlight?: boolean;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  label,
  children,
  required = false,
  tooltip,
  htmlFor,
  className,
  highlight = false
}) => {
  return (
    <div className={cn(
      "space-y-1.5 md:space-y-2",
      highlight && "ring-2 ring-destructive rounded-md p-2",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <Label 
          htmlFor={htmlFor} 
          className="text-xs md:text-sm font-medium"
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
};
