# Visual Assets & Image Skills

**Description:** Use this skill for downloading images from the web (including Twitter/X, GitHub, etc.) and correctly embedding them into the VibeML notebook UI using the Visualization Protocol.

## Workflow Rules & Guidelines
1. **Dependencies:** Ensure `requests pillow matplotlib` are installed.
2. **Download Rule:** ALWAYS use `requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})` to avoid being blocked by headless browser filters.
3. **Save Path:** ALWAYS save images to the `data/` directory relative to the current working directory.
4. **Vibe Visualization Protocol:** 
   - To show an image in the UI, you MUST print the tag `[IMAGE: <filename>]` to stdout.
   - You MUST NOT use `plt.show()` as it blocks the server process. Use `plt.close()` instead.
   - Always name your primary visualization `slice.png` if it is a single output, or use unique names for multiple outputs.

## Code Example: Clean Download & Display
```python
import requests
import os

# 1. Download source image (Use 'data/' folder)
os.makedirs('data', exist_ok=True)
url = 'https://example.com/asset.jpg'
image_path = 'data/asset.jpg'

response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
with open(image_path, 'wb') as f:
    f.write(response.content)

# 2. Trigger UI Embedding (Direct use of original file)
print('[IMAGE: asset.jpg]')
```

## Code Example: Medical Volume Slice
```python
import nibabel as nib
import matplotlib.pyplot as plt
import os

# 1. Load 3D Volume
img = nib.load('data/image.nii.gz').get_fdata()
slice_idx = img.shape[2] // 2

# 2. Create Plot
plt.imshow(img[:, :, slice_idx], cmap='gray')
plt.axis('off')

# 3. Save as PNG for UI
plt.savefig('data/slice.png', bbox_inches='tight', pad_inches=0)
plt.close() # FORBIDDEN: plt.show()

# 4. Trigger UI Embedding
print('[IMAGE: slice.png]')
```
