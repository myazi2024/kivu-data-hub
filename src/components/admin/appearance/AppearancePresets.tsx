import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export interface AppearancePreset {
  id: string;
  name: string;
  description: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  fontFamily: string;
  borderRadius: string;
}

export const APPEARANCE_PRESETS: AppearancePreset[] = [
  {
    id: 'apple-dark',
    name: 'Sombre Apple',
    description: 'Élégant, contrastes profonds, accents bleus',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75',
    light: {
      background: '0 0% 100%', foreground: '222 14% 18%',
      primary: '211 100% 50%', 'primary-foreground': '0 0% 100%',
      secondary: '210 16% 96%', 'secondary-foreground': '222 14% 18%',
      accent: '211 100% 50%', 'accent-foreground': '0 0% 100%',
      muted: '210 16% 96%', 'muted-foreground': '215 14% 45%',
      border: '214 16% 90%', card: '0 0% 100%', 'card-foreground': '222 14% 18%',
    },
    dark: {
      background: '222 18% 8%', foreground: '210 20% 96%',
      primary: '211 100% 56%', 'primary-foreground': '0 0% 100%',
      secondary: '222 14% 14%', 'secondary-foreground': '210 20% 96%',
      accent: '211 100% 56%', 'accent-foreground': '0 0% 100%',
      muted: '222 14% 14%', 'muted-foreground': '215 14% 65%',
      border: '222 14% 18%', card: '222 18% 11%', 'card-foreground': '210 20% 96%',
    },
  },
  {
    id: 'corporate-blue',
    name: 'Bleu corporate',
    description: 'Professionnel, sobre, lisibilité maximale',
    fontFamily: 'Roboto, sans-serif',
    borderRadius: '0.375',
    light: {
      background: '0 0% 100%', foreground: '215 28% 17%',
      primary: '217 91% 35%', 'primary-foreground': '0 0% 100%',
      secondary: '210 40% 96%', 'secondary-foreground': '215 28% 17%',
      accent: '217 91% 45%', 'accent-foreground': '0 0% 100%',
      muted: '210 40% 96%', 'muted-foreground': '215 16% 47%',
      border: '214 32% 91%', card: '0 0% 100%', 'card-foreground': '215 28% 17%',
    },
    dark: {
      background: '215 28% 12%', foreground: '210 40% 96%',
      primary: '217 91% 60%', 'primary-foreground': '0 0% 100%',
      secondary: '215 28% 18%', 'secondary-foreground': '210 40% 96%',
      accent: '217 91% 60%', 'accent-foreground': '0 0% 100%',
      muted: '215 28% 18%', 'muted-foreground': '215 20% 65%',
      border: '215 28% 22%', card: '215 28% 15%', 'card-foreground': '210 40% 96%',
    },
  },
  {
    id: 'minimal-light',
    name: 'Clair minimal',
    description: 'Épuré, blanc cassé, accents neutres',
    fontFamily: 'Open Sans, sans-serif',
    borderRadius: '0.5',
    light: {
      background: '60 9% 98%', foreground: '20 14% 16%',
      primary: '24 9% 24%', 'primary-foreground': '0 0% 100%',
      secondary: '60 5% 94%', 'secondary-foreground': '20 14% 16%',
      accent: '24 9% 35%', 'accent-foreground': '0 0% 100%',
      muted: '60 5% 94%', 'muted-foreground': '25 5% 45%',
      border: '20 6% 88%', card: '0 0% 100%', 'card-foreground': '20 14% 16%',
    },
    dark: {
      background: '20 14% 10%', foreground: '60 9% 95%',
      primary: '60 9% 90%', 'primary-foreground': '20 14% 10%',
      secondary: '20 14% 16%', 'secondary-foreground': '60 9% 95%',
      accent: '60 9% 80%', 'accent-foreground': '20 14% 10%',
      muted: '20 14% 16%', 'muted-foreground': '25 5% 65%',
      border: '20 14% 20%', card: '20 14% 13%', 'card-foreground': '60 9% 95%',
    },
  },
];

interface Props {
  onApply: (preset: AppearancePreset) => void;
}

export default function AppearancePresets({ onApply }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Presets prêts à l'emploi
        </CardTitle>
        <CardDescription>Cliquez pour charger un thème complet, puis sauvegardez.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {APPEARANCE_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => onApply(preset)}
            className="text-left rounded-lg border p-3 hover:border-primary transition-colors space-y-2"
          >
            <div className="flex gap-1">
              {['primary', 'accent', 'secondary', 'muted'].map(k => (
                <div key={k} className="h-6 w-6 rounded" style={{ backgroundColor: `hsl(${preset.light[k]})` }} />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold">{preset.name}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{preset.description}</p>
            </div>
            <Button size="sm" variant="outline" className="w-full h-7 text-xs">Appliquer</Button>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
