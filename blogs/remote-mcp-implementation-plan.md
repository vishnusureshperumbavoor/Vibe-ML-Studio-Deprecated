Enable Remote MCP Connections without Local Servers

Let VML Studio connect directly to hosted MCP endpoints (Hugging Face, Kaggle, etc.) over Streamable HTTP instead of proxying through local hf-server/kaggle-server.
Retain the existing local bridges as optional fallbacks so developers who still need them can run them side-by-side.
Key Changes

Add configuration values (HUGGINGFACE_MCP_URL, KAGGLE_MCP_URL, etc.) plus tokens to .env/.env.example and document that Claude-style clients can reuse them, clarifying that local servers are optional.
Introduce a shared services/mcpConnector.ts helper that instantiates @modelcontextprotocol/sdk’s StreamableHTTPClientTransport + Client for each configured remote endpoint, fetches each tool list once, and exposes callTool/listTools for VibeAgent.
Update services/vibeAgent.ts to consume that helper instead of hitting http://localhost:1001/1002; keep the existing local bridges as alternate URLs so we can still run them when needed.
Test Plan

Supply HUGGINGFACE_MCP_URL=https://huggingface.co/mcp and HF_TOKEN, start VML Studio without hf-server, and verify requesting a Hugging Face tool works (e.g., model_search).
Provide KAGGLE_MCP_URL=https://www.kaggle.com/mcp and a KGAT token, trigger a Kaggle tool (e.g., search_datasets), and confirm results arrive.
Flip back to the local bridges (ports 1001/1002) to ensure the agent still falls back to them when *_MCP_URL points to http://localhost.
Assumptions

Hosted MCP endpoints support streamable HTTP and require only a Bearer token; no additional onboarding logic is needed.
Users will provide the needed env vars so the connector knows which endpoints to talk to.
so i want to know how this will look like in the UI side. what the users has to do



User flow

Add a “Kaggle/Hugging Face MCP” section beside the existing controls in the bottom prompt bar (or a dedicated settings modal). Each entry shows:
The MCP name (e.g., “Hugging Face MCP (remote)”),
A toggle to enable/disable using that endpoint,
A link/button to open a small settings drawer where they paste the token/URL (pre-filled from .env for you, editable per-session).
When a user types a prompt, the agent automatically knows which MCP tools are available (because the new services/mcpConnector.ts loads each tool list once) and adds them to the system prompt. The UI simply shows the MCP tool list under “Available Tools” (with the source label: “Hugging Face”, “Kaggle”, etc.).
If the remote MCP is enabled, no additional local server needs to run—VibeAgent calls it directly. If they prefer the local bridge, they can flip the toggle to “Local” and the UI switches the connector URL to http://localhost:1001/1002 (same toggle, same settings view).
A lightweight “status pill” near the MCP list shows connection success/failure (green check or red badge). Hovering it reveals last response time and token info so the user knows when they need to refresh tokens.