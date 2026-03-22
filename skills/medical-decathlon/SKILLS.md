# Medical Segmentation Decathlon (MSD) Skill

**Description:** Use this skill specifically for pulling, caching, and staging massive 3D medical imaging matrices (MRI, CT, PET scans) from the MSD using the specialized MONAI library.

## Workflow Rules & Guidelines
1. **Dependencies:** Deep-learning medical data mandates specific libraries for `.nii.gz` arrays. Ensure `monai nibabel torch` are installed.
2. **Dataset Caching Strategy:** Medical datasets are extremely heavy (often 10s of GBs). You must assign a dedicated `root_dir` for caching using the `DecathlonDataset` wrapper to prevent constant re-downloading across execution loops.
3. **Boilerplate Example & Transforms:** 3D images almost always lack defined channel dimensions at loading. You MUST dynamically add channel dimensions via `EnsureChannelFirstd`.
   ```python
   from monai.apps import DecathlonDataset
   from monai.transforms import Compose, LoadImaged, EnsureChannelFirstd, ScaleIntensityd, ToTensord
   import os

   root_dir = './data/medical_cache'
   os.makedirs(root_dir, exist_ok=True)
   
   # Safely standardizing Medical 3D Images
   train_transforms = Compose([
       LoadImaged(keys=["image", "label"]),
       EnsureChannelFirstd(keys=["image", "label"]),
       ScaleIntensityd(keys="image"),
       ToTensord(keys=["image", "label"])
   ])

   # Auto-Download and Verification via Monai
   train_ds = DecathlonDataset(
       root_dir=root_dir,
       task="Task01_BrainTumour", # Select contextually between Task01 to Task10
       transform=train_transforms,
       section="training",
       download=True
   )
   ```
4. **Validation:** Ensure the dataloader parses the volumes before dispatching the task to the ML Architect agent. 3D matrices frequently cause Out of Memory errors, so heavily suggest a batch size of 1 or 2 as a conservative default.
