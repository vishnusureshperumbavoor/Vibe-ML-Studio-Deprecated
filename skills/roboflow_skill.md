# Roboflow Computer Vision Skill

**Description:** Use this skill for autonomously downloading annotated computer vision datasets (object detection, semantic segmentation, classification) from Roboflow Universe.

## Workflow Rules & Guidelines
1. **Dependencies:** The pipeline must ensure `roboflow` is installed (`pip install roboflow`).
2. **Authentication:** Never hardcode the API key. Prompt the user for it if the environment variable `ROBOFLOW_API_KEY` is not present.
3. **Boilerplate Usage:** Use the exact Roboflow SDK syntax to pull specific dataset versions to the `/data` directory:
   ```python
   import os
   from roboflow import Roboflow

   api_key = os.getenv("ROBOFLOW_API_KEY")
   if api_key:
       rf = Roboflow(api_key=api_key)
       # Expect user to provide workspace and project names
       project = rf.workspace("<WORKSPACE>").project("<PROJECT_NAME>")
       version = project.version(1) 
       
       # Download in the correct format for the model being trained:
       dataset = version.download("yolov8") # YOLOv8 txt format
       # dataset = version.download("coco") # PyTorch/Torchvision JSON format
   ```
4. **Validation:** After downloading, perform a quick generic health-check by printing the number of generated training/validation images to confirm successful extraction before passing to the ML Architect agent.
