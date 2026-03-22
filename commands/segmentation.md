# Command: @segment (3D Medical Segmentation Macro)

**Trigger**: Whenever the user types `@segment <organ_name>`

**Implementation Template**:
1. Load dataset (Medical Decathlon or local).
2. Setup MONAI 3D preprocessing transforms (LoadImaged, AddChanneld, Spacingd, Orientationd, ScaleIntensityRanged, CropForegroundd).
3. Initialize 3D UNet with DiceLoss.
4. Setup sliding_window_inference for evaluation.
