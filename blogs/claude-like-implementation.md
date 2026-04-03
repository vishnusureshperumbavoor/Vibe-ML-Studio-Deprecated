Claude concepts

Connectors are MCP endpoints (local or remote) that expose tools and data to the LLM. They run as MCP servers and simply provide /mcp/list + /mcp/call for each integration (Google Drive, Slack, Roboflow, etc.). Claude knows which tools are provided by reading the MCP metadata and can surface connector-specific UI (buttons, cards). (claude.com)
Skills are folders (with SKILL.md plus optional scripts/resources) that Claude loads on demand when a request matches the skill’s description; they inject extra instructions and can pull in code or reference files. (claude.com)
Plugins bundle connectors, skills, slash commands, and sub-agents into a single package you can install/share; they encapsulate a full workflow (e.g., a finance plugin might expose a connector to QuickBooks plus skills for reports). (claude.com)
How to mirror this in VML Studio

Connectors → MCP bridges

Keep your existing hf-server and kaggle-server (or remote URLs) as connector definitions. Each connector should expose metadata (name, description, tool list) that the UI displays alongside a “connected” indicator.
Add a settings panel where the user can enable/disable connectors, edit the MCP URL/token (defaults from .env), and see last-sync status—mirroring Claude’s “Add Connector” flow. (claude.com)
Skills → Skill folders/SKILL.md

Create skills/<name>/SKILL.md docs describing what each skill does (e.g., “medical-report formatter”). Let the agent read them via your existing load_skill/load_skill_resource tools when a user request matches.
You can pre-scan skill metadata (name + short description) so the UI shows “Available Skills” and lets the user say “Use skill XYZ” the same way Claude auto-activates skills by intent. (claude.com)
Plugins → Capability bundles

Define a “plugin” structure (folder or JSON manifest) that ties one or more connectors + related skills + helper commands together. For example, a “Roboflow plugin” can include the Roboflow MCP connector plus a skill for interpreting detection output.
Build a simple installer UI that copies the plugin into your skills/ and registers its MCP URL (or shows how to configure it), similar to Claude’s plugin marketplace. (claude.com)
UI/UX for VML

Show connected connectors at the bottom (like Claude’s “Search and Tools” menu) with toggles and quick “Test connection” buttons.
Display the available skills/plugins in a sidebar so users can see what capabilities the agent can automatically activate.
Keep tool invocation hidden; the LLM picks the right connector/skill when you describe the task (“Summarize this dataset”) because the system prompt describes the tool set, just like Claude routes dataset requests to Kaggle if those tools are registered. (claude.com)
Would you like me to draft the UI skeleton for connectors/skills or to refactor services/vibeAgent.ts into a “connector-aware” manager next?