import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMfaStatus } from '@/hooks/useMfaStatus';
import { MfaChallengeDialog } from '@/components/auth/MfaChallengeDialog';
import { MfaEnrollDialog } from '@/components/auth/MfaEnrollDialog';
import type { AppRole } from '@/constants/roles';
import { useToast } from '@/hooks/use-toast';

const SENSITIVE_ROLES: AppRole[] = ['admin', 'super_admin'];

type RequireAal2 = (reason?: string) => Promise<boolean>;

interface MfaGuardCtx {
  /**
   * Wrap any sensitive admin action: returns `true` once AAL2 is reached
   * (either already, or after a successful TOTP challenge), `false` if the
   * user cancels.
   */
  requireAal2: RequireAal2;
  /** Open the enrollment dialog (used from settings UI). */
  openEnroll: () => void;
}

const Ctx = createContext<MfaGuardCtx | null>(null);

interface ProviderProps { children: ReactNode }

/**
 * Provides:
 *   - `requireAal2(reason)` to elevate the session before any sensitive write
 *   - automatic enrollment dialog for admin/super_admin who have no factor yet
 */
export const MfaGuardProvider = ({ children }: ProviderProps) => {
  const { profile } = useAuth();
  const mfa = useMfaStatus();
  const { toast } = useToast();

  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeReason, setChallengeReason] = useState<string | undefined>();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const pendingResolverRef = useRef<((ok: boolean) => void) | null>(null);

  const isSensitiveRole = !!profile && SENSITIVE_ROLES.includes(profile.role);
  const mustEnroll = isSensitiveRole && !mfa.loading && !mfa.hasVerifiedFactor;

  const requireAal2: RequireAal2 = useCallback(async (reason) => {
    // No MFA configured → must enroll first
    if (!mfa.hasVerifiedFactor) {
      toast({
        variant: 'destructive',
        title: '2FA requise',
        description: 'Activez l\'authentification à deux facteurs avant cette action.',
      });
      setEnrollOpen(true);
      return false;
    }
    if (mfa.currentLevel === 'aal2') return true;

    return new Promise<boolean>((resolve) => {
      pendingResolverRef.current = resolve;
      setChallengeReason(reason);
      setChallengeOpen(true);
    });
  }, [mfa.hasVerifiedFactor, mfa.currentLevel, toast]);

  const handleChallengeChange = (open: boolean) => {
    setChallengeOpen(open);
    if (!open && pendingResolverRef.current) {
      pendingResolverRef.current(false);
      pendingResolverRef.current = null;
    }
  };

  const handleChallengeSuccess = () => {
    if (pendingResolverRef.current) {
      pendingResolverRef.current(true);
      pendingResolverRef.current = null;
    }
    mfa.refresh();
  };

  const value = useMemo<MfaGuardCtx>(() => ({
    requireAal2,
    openEnroll: () => setEnrollOpen(true),
  }), [requireAal2]);

  return (
    <Ctx.Provider value={value}>
      {children}

      <MfaChallengeDialog
        open={challengeOpen}
        onOpenChange={handleChallengeChange}
        onSuccess={handleChallengeSuccess}
        reason={challengeReason}
      />

      <MfaEnrollDialog
        open={enrollOpen || mustEnroll}
        onOpenChange={(o) => {
          // Admins cannot dismiss enrollment until they have a factor
          if (mustEnroll && !o) return;
          setEnrollOpen(o);
        }}
        onEnrolled={() => mfa.refresh()}
      />
    </Ctx.Provider>
  );
};

export function useMfaGuard(): MfaGuardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMfaGuard must be used within <MfaGuardProvider>');
  return ctx;
}
