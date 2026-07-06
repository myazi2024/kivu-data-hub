import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_publications",
  title: "List publications",
  description:
    "List the most recent published publications available on the BIC platform (title, category, price, publication date).",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of publications to return (default 10, max 50)."),
    category: z
      .string()
      .optional()
      .describe("Optional category filter (case-insensitive substring match)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let query = supabase
      .from("publications")
      .select("id,title,category,price_usd,published_at,status")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit ?? 10);
    if (category) query = query.ilike("category", `%${category}%`);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { publications: data ?? [] },
    };
  },
});
