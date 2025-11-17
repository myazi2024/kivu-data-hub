import React from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  className,
  icon
}) => {
  return (
    <div className={cn(
      "space-y-2.5 md:space-y-4 p-3 md:p-4 rounded-lg border border-border/50 bg-muted/20",
      className
    )}>
      <h3 className="text-sm md:text-lg font-semibold text-foreground flex items-center gap-2">
        {icon || <span className="h-1 w-1 rounded-full bg-primary" />}
        {title}
      </h3>
      {children}
    </div>
  );
};
