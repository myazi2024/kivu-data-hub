// Background test data generation orchestrator.
// Returns a job_id immediately and continues running via EdgeRuntime.waitUntil
// so the admin can close the tab without aborting the run.
//
// Progress is persisted to `test_generation_jobs` (Realtime-enabled) so the
// UI can subscribe and resume display on reconnect.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { admin } from "../_shared/testModeAdminClient.ts";
import {
  uniqueSuffix,
  generateParcelNumbers,
  verifyTestModeEnabled,
} from "../_shared/test-mode-generators/_shared.ts";
import { generateParcels } from "../_shared/test-mode-generators/parcels.ts";
import {
  generateContributions,
  generateContributorCodes,
  generateFraudAttempts,
} from "../_shared/test-mode-generators/contributions.ts";
import { generateInvoices } from "../_shared/test-mode-generators/invoices.ts";
import { generatePayments } from "../_shared/test-mode-generators/payments.ts";
import { generateTitleRequests } from "../_shared/test-mode-generators/titles.ts";
import {
  generateExpertiseRequests,
  generateExpertisePayments,
} from "../_shared/test-mode-generators/expertise.ts";
import {
  generateDisputes,
  generateBoundaryConflicts,
} from "../_shared/test-mode-generators/disputes.ts";
import {
  generateOwnershipHistory,
  generateTaxHistory,
  generateBoundaryHistory,
} from "../_shared/test-mode-generators/parcelHistories.ts";
import {
  generateMortgages,
  generateMortgagePayments,
} from "../_shared/test-mode-generators/mortgages.ts";
import { generateBuildingPermits } from "../_shared/test-mode-generators/permits.ts";
import {
  generateCertificates,
  generateMutationRequests,
  generateSubdivisionRequests,
} from "../_shared/test-mode-generators/certificatesAndRequests.ts";
import { generateSubdivisionLotsAndRoads } from "../_shared/test-mode-generators/subdivisionDetails.ts";

// deno-lint-ignore no-explicit-any
const EdgeRuntime: any = (globalThis as any).EdgeRuntime;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface StepRecord {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

interface JobCtx {
  userId: string;
  suffix: string;
  parcelNumbers: string[];
  // deno-lint-ignore no-explicit-any
  parcels: any[];
  // deno-lint-ignore no-explicit-any
  contributions: any[];
  // deno-lint-ignore no-explicit-any
  invoices: any[];
  failedSubsteps: string[];
}

interface StepDef {
  key: string;
  label: string;
  blocking: boolean;
  run: (ctx: JobCtx) => Promise<void>;
}

function buildSteps(): StepDef[] {
  const sub = async (ctx: JobCtx, label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      ctx.failedSubsteps.push(label);
      console.error(`[generate-test-data] ${label} (non-bloquant):`, e);
    }
  };

  return [
    {
      key: "verify",
      label: "Vérification du mode test",
      blocking: true,
      run: async () => {
        const enabled = await verifyTestModeEnabled();
        if (!enabled) throw new Error("Mode test non actif côté serveur");
      },
    },
    {
      key: "parcels",
      label: "Parcelles cadastrales",
      blocking: true,
      run: async (ctx) => {
        ctx.parcels = await generateParcels(ctx.parcelNumbers);
      },
    },
    {
      key: "contributions",
      label: "Contributions cadastrales",
      blocking: true,
      run: async (ctx) => {
        ctx.contributions = await generateContributions(
          ctx.userId,
          ctx.parcelNumbers,
        );
      },
    },
    {
      key: "invoices",
      label: "Factures",
      blocking: true,
      run: async (ctx) => {
        ctx.invoices = await generateInvoices(ctx.userId, ctx.parcelNumbers);
      },
    },
    {
      key: "payments",
      label: "Transactions de paiement",
      blocking: true,
      run: async (ctx) => {
        await generatePayments(ctx.userId, ctx.invoices);
      },
    },
    {
      key: "service_access",
      label: "Provisioning accès services (trigger auto)",
      blocking: false,
      run: async () => {/* no-op — trigger trg_provision_service_access_on_paid */},
    },
    {
      key: "ccc",
      label: "Codes contributeurs (CCC)",
      blocking: false,
      run: async (ctx) => {
        await generateContributorCodes(ctx.userId, ctx.contributions);
      },
    },
    {
      key: "titles",
      label: "Demandes de titres fonciers",
      blocking: false,
      run: async (ctx) => {
        await generateTitleRequests(ctx.userId, ctx.suffix);
      },
    },
    {
      key: "expertise",
      label: "Demandes d'expertise",
      blocking: false,
      run: async (ctx) => {
        const requests = await generateExpertiseRequests(
          ctx.userId,
          ctx.parcels,
          ctx.suffix,
        );
        await generateExpertisePayments(ctx.userId, requests);
      },
    },
    {
      key: "disputes",
      label: "Litiges fonciers",
      blocking: false,
      run: async (ctx) => {
        await generateDisputes(ctx.parcels, ctx.suffix, ctx.userId);
      },
    },
    {
      key: "history",
      label: "Historique propriété & taxes",
      blocking: false,
      run: async (ctx) => {
        await generateOwnershipHistory(ctx.parcels);
        await generateTaxHistory(ctx.parcels);
      },
    },
    {
      key: "mortgages_permits",
      label: "Bornages & hypothèques & autorisations",
      blocking: false,
      run: async (ctx) => {
        // deno-lint-ignore no-explicit-any
        let mortgages: any[] = [];
        await sub(ctx, "Bornages", async () => {
          await generateBoundaryHistory(ctx.parcels);
        });
        await sub(ctx, "Hypothèques", async () => {
          mortgages = await generateMortgages(ctx.parcels);
        });
        await sub(ctx, "Paiements hypothèques", async () => {
          await generateMortgagePayments(mortgages);
        });
        await sub(ctx, "Autorisations de bâtir", async () => {
          await generateBuildingPermits(ctx.parcels);
        });
        await sub(ctx, "Conflits de limites", async () => {
          await generateBoundaryConflicts(ctx.parcelNumbers, ctx.userId);
        });
      },
    },
    {
      key: "fraud_certs",
      label: "Fraudes & certificats",
      blocking: false,
      run: async (ctx) => {
        await generateFraudAttempts(ctx.userId, ctx.contributions);
        await generateCertificates(ctx.parcelNumbers, ctx.suffix, ctx.userId);
      },
    },
    {
      key: "mutations_subdivisions",
      label: "Mutations & lotissements",
      blocking: false,
      run: async (ctx) => {
        // deno-lint-ignore no-explicit-any
        let subdivisions: any[] = [];
        await sub(ctx, "Mutations", async () => {
          await generateMutationRequests(ctx.userId, ctx.parcels, ctx.suffix);
        });
        await sub(ctx, "Lotissements", async () => {
          subdivisions = await generateSubdivisionRequests(
            ctx.userId,
            ctx.parcels,
            ctx.suffix,
          );
        });
        await sub(ctx, "Lots/voies de lotissement", async () => {
          await generateSubdivisionLotsAndRoads(subdivisions);
        });
      },
    },
  ];
}

async function isJobCancelled(jobId: string): Promise<boolean> {
  const { data } = await admin
    .from("test_generation_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();
  return data?.status === "cancelled";
}

async function runJob(jobId: string, userId: string): Promise<void> {
  const steps = buildSteps();
  const stepsState: StepRecord[] = steps.map((s) => ({
    key: s.key,
    label: s.label,
    status: "pending",
  }));
  const ctx: JobCtx = {
    userId,
    suffix: uniqueSuffix(),
    parcelNumbers: [],
    parcels: [],
    contributions: [],
    invoices: [],
    failedSubsteps: [],
  };
  ctx.parcelNumbers = generateParcelNumbers(ctx.suffix);

  await admin
    .from("test_generation_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
      steps_state: stepsState,
      total_steps: steps.length,
      suffix: ctx.suffix,
    })
    .eq("id", jobId);

  // Periodic heartbeat — proves the function is still alive even during a
  // long-running step. Lets `_purge_stale_test_generation_jobs` distinguish
  // a slow step from a dead worker.
  const heartbeatInterval = setInterval(async () => {
    try {
      await admin
        .from("test_generation_jobs")
        .update({ heartbeat_at: new Date().toISOString() })
        .eq("id", jobId);
    } catch (e) {
      console.warn(`[generate-test-data] heartbeat failed for ${jobId}:`, e);
    }
  }, 20_000);

  try {
    for (let i = 0; i < steps.length; i++) {
      if (await isJobCancelled(jobId)) {
        console.log(`[generate-test-data] job ${jobId} cancelled by admin`);
        return;
      }
      const step = steps[i];
      stepsState[i].status = "running";
      await admin
        .from("test_generation_jobs")
        .update({
          current_step_index: i,
          current_step_key: step.key,
          steps_state: stepsState,
          heartbeat_at: new Date().toISOString(),
          counts: {
            parcels: ctx.parcels.length,
            contributions: ctx.contributions.length,
            invoices: ctx.invoices.length,
          },
        })
        .eq("id", jobId);

      try {
        await step.run(ctx);
        const hadSubFailures =
          (step.key === "mortgages_permits" ||
            step.key === "mutations_subdivisions") &&
          ctx.failedSubsteps.length > 0;
        stepsState[i].status = hadSubFailures ? "error" : "done";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stepsState[i].status = "error";
        stepsState[i].error = msg;
        if (step.blocking) {
          await admin
            .from("test_generation_jobs")
            .update({
              status: "error",
              error: `${step.label}: ${msg}`,
              steps_state: stepsState,
              failed_substeps: ctx.failedSubsteps,
              finished_at: new Date().toISOString(),
              counts: {
                parcels: ctx.parcels.length,
                contributions: ctx.contributions.length,
                invoices: ctx.invoices.length,
              },
            })
            .eq("id", jobId);
          return;
        }
        ctx.failedSubsteps.push(step.label);
      }
    }

    await admin
      .from("test_generation_jobs")
      .update({
        status: "done",
        steps_state: stepsState,
        failed_substeps: ctx.failedSubsteps,
        finished_at: new Date().toISOString(),
        counts: {
          parcels: ctx.parcels.length,
          contributions: ctx.contributions.length,
          invoices: ctx.invoices.length,
        },
      })
      .eq("id", jobId);

    // Audit log (mirrors what the client used to do)
    await admin.from("audit_logs").insert({
      user_id: userId,
      action: "TEST_DATA_GENERATED",
      table_name: "cadastral_contributions",
      new_values: {
        contributions: ctx.contributions.length,
        invoices: ctx.invoices.length,
        parcels: ctx.parcels.length,
        suffix: ctx.suffix,
        failedSteps: ctx.failedSubsteps,
        background: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[generate-test-data] fatal error in job ${jobId}:`, err);
    await admin
      .from("test_generation_jobs")
      .update({
        status: "error",
        error: msg,
        steps_state: stepsState,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid JWT" }, 401);
    const callerId = userData.user.id;

    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["admin", "super_admin"]);
    if (rolesErr) return json({ error: "Role check failed" }, 500);
    if (!roles || roles.length === 0) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }

    // Reject if a job is already active
    const { data: existing } = await admin
      .from("test_generation_jobs")
      .select("id, status")
      .in("status", ["queued", "running"])
      .limit(1);
    if (existing && existing.length > 0) {
      return json({
        error: "Un job de génération est déjà en cours",
        active_job_id: existing[0].id,
      }, 409);
    }

    // Create the job row
    const { data: job, error: insertErr } = await admin
      .from("test_generation_jobs")
      .insert({
        user_id: callerId,
        status: "queued",
        total_steps: 14,
      })
      .select("id")
      .single();
    if (insertErr || !job) {
      return json({ error: insertErr?.message ?? "Job insert failed" }, 500);
    }

    // Fire and forget — keep running after responding
    if (EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(runJob(job.id, callerId));
    } else {
      // Fallback (dev) — still launch but the runtime may kill it
      runJob(job.id, callerId).catch((e) =>
        console.error("runJob error", e)
      );
    }

    return json({ ok: true, job_id: job.id }, 202);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-test-data] handler error:", err);
    return json({ error: msg }, 500);
  }
});
