import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "verify_document",
  title: "Verify a BIC document",
  description:
    "Verify the authenticity of a BIC-issued document (certificate, permit, mutation, etc.) by its verification code. Returns non-sensitive validity metadata only.",
  inputSchema: {
    code: z
      .string()
      .min(3)
      .describe("The verification code printed on the document (e.g. BIC-CERT-XXXX)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ code }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase.rpc("verify_document_public", {
      _verification_code: code.trim(),
    });
    if (error) {
      return {
        content: [{ type: "text", text: `Verification unavailable: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? { valid: false }, null, 2) }],
      structuredContent: { result: data ?? { valid: false } },
    };
  },
});
