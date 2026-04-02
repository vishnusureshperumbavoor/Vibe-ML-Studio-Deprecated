import asyncio
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
import mcp.types as types
from huggingface_hub import HfApi
import os
from dotenv import load_dotenv

# Load token
load_dotenv()
hf_api = HfApi()

# Create the MCP Server instance
server = Server("vml-huggingface")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available Hugging Face tools via MCP."""
    return [
        types.Tool(
            name="model_search",
            description="Search for models on the Hugging Face Hub.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "integer", "description": "Max results", "default": 5}
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="dataset_search",
            description="Search for datasets on the Hugging Face Hub.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "integer", "description": "Max results", "default": 5}
                },
                "required": ["query"],
            },
        )
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution requests via MCP."""
    hf_token = os.getenv("HF_TOKEN")
    
    if name == "model_search":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        models = hf_api.list_models(search=query, limit=limit, token=hf_token)
        results = [f"- **{m.id}** (Downloads: {getattr(m, 'downloads', 'N/A')})" for m in models]
        text = "\n".join(results) or "No models found."
        return [types.TextContent(type="text", text=text)]

    elif name == "dataset_search":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        datasets = hf_api.list_datasets(search=query, limit=limit, token=hf_token)
        results = [f"- **{d.id}** (Downloads: {getattr(d, 'downloads', 'N/A')})" for d in datasets]
        text = "\n".join(results) or "No datasets found."
        return [types.TextContent(type="text", text=text)]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="vml-huggingface",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())
