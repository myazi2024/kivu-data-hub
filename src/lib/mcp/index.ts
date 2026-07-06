import { defineMcp } from "@lovable.dev/mcp-js";
import listPublicationsTool from "./tools/list-publications";
import listArticlesTool from "./tools/list-articles";
import verifyDocumentTool from "./tools/verify-document";

export default defineMcp({
  name: "bic-mcp",
  title: "BIC RDC MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the BIC (Bureau d'Intelligence Cadastrale RDC) platform: list published publications and articles, and verify the authenticity of a BIC-issued document by its verification code.",
  tools: [listPublicationsTool, listArticlesTool, verifyDocumentTool],
});
