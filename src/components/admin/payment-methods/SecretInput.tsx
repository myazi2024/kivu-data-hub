import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface SecretInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  revealed: boolean;
  onToggleReveal: () => void;
}

export const SecretInput: React.FC<SecretInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  revealed,
  onToggleReveal,
}) => {
  const isMaskedValue = value?.includes('••••');

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs md:text-sm">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={revealed ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (isMaskedValue) onChange(''); }}
          className="text-sm pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          onClick={onToggleReveal}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
};
