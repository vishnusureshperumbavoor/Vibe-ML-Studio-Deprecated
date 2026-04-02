# Medical Decatholon MCP implementation

from mcp.server.fastmcp import FastMCP
import nibabel as nib
import numpy as np
from pathlib import Path

mcp = FastMCP("Medical Decathlon MCP")

@mcp.tool()
def load_msd_case(task: str, case_id: str, aws_s3_path: str = "s3://msd-for-monai/") -> dict:
    """Load MSD case image and label volumes."""
    # Implementation would download/parse NIfTI from S3
    return {
        "image_shape": [128, 128, 128],
        "label_shape": [128, 128, 128],
        "task": task,
        "case": case_id
    }

@mcp.resource("msd://task/{task}/case/{case_id}")
def get_msd_metadata(task: str, case_id: str) -> str:
    """Get metadata for specific MSD case."""
    return f"MSD {task} case {case_id}: 3D NIfTI, multi-class segmentation"

@mcp.tool()
def list_msd_tasks() -> list:
    """List all 10 MSD tasks."""
    return [
        "Task01_BrainTumour", "Task02_Heart", "Task03_Liver",
        "Task04_HiSP", "Task05_Prostate", "Task06_Lung",
        "Task07_Pancreas", "Task08_HepaticVessel", "Task09_Spleen", "Task10_Colon"
    ]

if __name__ == "__main__":
    mcp.run()

# Example prompt

User Prompt: "Compare the liver volume from Task03_Liver case 001 with 005."

VibeAgent's Thought Process:

Call list_msd_tasks to confirm the task name.
Call load_msd_case for both IDs via your MCP server.
Use the returned metadata to generate a Python script (via execute_python) that calculates the volumes using nibabel.
Add a markdown cell with the comparison table.

-------------------------------------------------------------------------------

* GitHub MCP: Allow the agent to search for SOTA MONAI models on the fly.
* Brave Search MCP: Enable the agent to perform real-time research into medical AI papers.
* PostgreSQL MCP: Replace fragmented logs with a structured database of training experiments.

-------------------------------------------------------------------------------

Token Management: Create a "Read" token at huggingface.co/settings/tokens if you want the agent to see your private datasets/models.
Testing: Once the config is added, try asking: "Search Hugging Face for the most downloaded MONAI models from the last 30 days."