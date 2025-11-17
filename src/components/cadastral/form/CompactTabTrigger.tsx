import React from 'react';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface CompactTabTriggerProps {
  value: string;
  icon: React.ReactNode;
  label: string;
  shortLabel?: string;
  isMobile?: boolean;
  isCompleted?: boolean;
}

export const CompactTabTrigger: React.FC<CompactTabTriggerProps> = ({
  value,
  icon,
  label,
  shortLabel,
  isMobile = false,
  isCompleted = false
}) => {
  return (
    <TabsTrigger 
      value={value}
      className="flex items-center justify-center gap-1.5 text-[10px] md:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-1 md:px-3 h-full relative group"
    >
      {icon}
      <span className={cn(
        "hidden sm:inline",
        isMobile && "text-[10px]"
      )}>
        {shortLabel || label}
      </span>
      <span className="hidden lg:inline">{label !== shortLabel && label.replace(shortLabel || '', '')}</span>
      {isCompleted && (
        <CheckCircle2 className="h-3 w-3 absolute -top-1 -right-1 text-green-500 bg-background rounded-full" />
      )}
    </TabsTrigger>
  );
};
