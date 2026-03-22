# Dependency Management Skill (Magic Pip)

**Description:** Use this skill to autonomously declare and handle third-party library installations required for your generated Machine Learning code.

## Workflow Rules & Guidelines

1. **The Notebook Magic Command**: Our FastAPI backend strictly understands Jupyter Notebook style magic commands. 
2. **Declaration**: Whenever you write Python code that requires a library outside of standard Python (e.g., `xgboost`, `sentence-transformers`, `torch`), you **must** prepend the exact `!pip install <package_name>` strings at the very top of the cell.
3. **Execution**: The backend will intercept these magic lines, run standard shell subprocesses to install the requirements into the active virtual environment on the host machine, and then strip the lines out before running the core `.py` script.

### Syntax Example
If a user requests structural similarity on an image using Scikit-Image:

```python
!pip install scikit-image numpy

import numpy as np
from skimage.metrics import structural_similarity as ssim

# Implementation...
```

4. **Multiple Packages**: You can string multiple packages together to save execution cycles (e.g. `!pip install transformers accelerate bitsandbytes`). Do not run `!pip install` inside functions or `if __name__ == "__main__"`, keep them strictly at the top of the generated code payload.
