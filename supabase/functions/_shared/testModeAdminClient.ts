// Service-role Supabase client used by the test-mode generators when running
// inside the `generate-test-data` edge function. Bypasses RLS so that we can
// insert into all the cadastral tables required for a full test fixture.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
