# Medical Segmentation Decathlon (MSD) Skill

**Description:** Use this skill for pulling and visualizing 3D medical imaging matrices (MRI, CT) from the MSD using the stable MONAI 'DecathlonDataset' class.

## Workflow Rules & Guidelines
1. **Dependencies:** Ensure `monai nibabel matplotlib` are installed.
2. **Import Rule:** ALWAYS use `from monai.apps import DecathlonDataset`. Do NOT try to import it from `monai.data`.
3. **Download Loop:**
   ```python
   from monai.apps import DecathlonDataset
   from monai.transforms import Compose, LoadImaged, EnsureChannelFirstd, ScaleIntensityd
   import os
   import matplotlib.pyplot as plt
5. **Task Metadata**: 
   - To see detailed modality and labels for a specific task, use:
     `<load_skill_resource>{"skill": "medical-decathlon", "filename": "decathlon-task-specs.json"}</load_skill_resource>`
   root_dir = './data'
   os.makedirs(root_dir, exist_ok=True)
   
   # 1. Load with Download=True
   dataset = DecathlonDataset(
       root_dir=root_dir,
       task="Task04_Hippocampus", # Example: Task01-Task10
       section="training",
       download=True,
       transform=Compose([
           LoadImaged(keys=["image", "label"]),
           EnsureChannelFirstd(keys=["image", "label"]),
           ScaleIntensityd(keys="image")
       ])
   )

   # 2. Visualize the first image slice
   sample = dataset[0]
   img = sample["image"][0] # Shape [H, W, D]
   plt.imshow(img[:, :, img.shape[2]//2], cmap='gray')
   plt.title("Hippocampus Slice")
   plt.show()
   ```

4. **Performance:** Use `batch_size=1` for 3D tasks to avoid OOM (Out of Memory) on local machines.
