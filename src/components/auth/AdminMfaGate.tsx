import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMfaStatus } from '@/hooks/useMfaStatus';
import { isAdminRole } from '@/components/auth/mfaConstants';
import { MfaChallengeDialog } from '@/components/auth/MfaChallengeDialog';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props { children: ReactNode }

/**
 * Guard placed inside admin routes: ensures admins/super_admins are at AAL2.
 * - Sans facteur : oblige l'enrôlement (dialog non-fermable).
 * - Avec facteur, session aal1 : force le challenge avant rendu.
 * Pour les autres rôles, agit comme passthrough.
 */
const AdminMfaGate: React.FC<Props> = ({ children }) => {
  const { profile, loading: authLoading } = useAuth();
  const mfa = useMfaStatus();
  const navigate = useNavigate();
  const [challengeOpen, setChallengeOpen] = useState(false);

  const mustGuard = !!profile && isAdminRole(profile.role);
  const needEnroll = mustGuard && !mfa.loading && !mfa.hasVerifiedFactor;
  const needChallenge = mustGuard && !mfa.loading && mfa.hasVerifiedFactor && mfa.currentLevel !== 'aal2';

  useEffect(() => {
    setChallengeOpen(needChallenge);
  }, [needChallenge]);

  if (authLoading || mfa.loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Block admin UI while MFA isn't satisfied
  if (mustGuard && (needEnroll || needChallenge)) {
    return (
      <>
        <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 space-y-3 text-center">
              <ShieldAlert className="h-10 w-10 text-warning mx-auto" />
              <h2 className="text-lg font-semibold">Vérification à deux facteurs requise</h2>
              <p className="text-sm text-muted-foreground">
                {needEnroll
                  ? 'Votre rôle d\'administrateur impose l\'activation de la 2FA. Suivez les étapes pour configurer votre application d\'authentification.'
                  : 'Veuillez saisir votre code à 6 chiffres pour accéder à la console d\'administration.'}
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
            </CardContent>
          </Card>
        </div>

        <MfaChallengeDialog
          open={challengeOpen}
          onOpenChange={(o) => {
            if (needChallenge && !o) return;
            setChallengeOpen(o);
          }}
          onSuccess={() => mfa.refresh()}
          reason="accès à la console d'administration"
        />
      </>
    );
  }

  return <>{children}</>;
};

export default AdminMfaGate;
