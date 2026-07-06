import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_articles",
  title: "List articles",
  description:
    "List the most recent published articles/blog posts from the BIC platform (title, slug, theme, published date).",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of articles to return (default 10, max 50)."),
    theme: z.string().optional().describe("Optional theme filter (case-insensitive substring)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, theme }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let query = supabase
      .from("articles")
      .select("id,title,slug,theme,published_at,status")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit ?? 10);
    if (theme) query = query.ilike("theme", `%${theme}%`);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { articles: data ?? [] },
    };
  },
});
