#!/usr/bin/env python3
"""
Quick environment sanity check for the LUNAR-X / LUNARIS backend.

Run this before `python run.py` if you're not sure your environment is
ready:

    python check_setup.py

It checks:
  - Python version (3.11+ required, matches pyproject.toml)
  - That the required third-party packages are importable
  - Whether a CUDA GPU is available (informational only — CPU works fine)
"""

from __future__ import annotations

import importlib
import sys

REQUIRED_MODULES = [
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn[standard]"),
    ("pydantic", "pydantic"),
    ("pydantic_settings", "pydantic-settings"),
    ("sqlalchemy", "sqlalchemy"),
    ("aiosqlite", "aiosqlite"),
    ("multipart", "python-multipart"),
    ("dotenv", "python-dotenv"),
    ("sse_starlette", "sse-starlette"),
    ("httpx", "httpx"),
    ("numpy", "numpy"),
    ("scipy", "scipy"),
    ("cv2", "opencv-contrib-python"),
    ("skimage", "scikit-image"),
    ("PIL", "pillow"),
    ("torch", "torch"),
    ("torchvision", "torchvision"),
    ("kornia", "kornia"),
    ("yaml", "pyyaml"),
    ("matplotlib", "matplotlib"),
    ("psutil", "psutil"),
]


def main() -> int:
    ok = True

    print("Python:", sys.version.split()[0])
    if sys.version_info < (3, 11):
        print("  WARNING: Python 3.11+ is recommended (pyproject.toml requires >=3.11).")

    print("\nChecking required packages...")
    missing: list[str] = []
    for module_name, pip_name in REQUIRED_MODULES:
        try:
            importlib.import_module(module_name)
            print(f"  [ok]      {pip_name}")
        except ImportError:
            print(f"  [missing] {pip_name}")
            missing.append(pip_name)
            ok = False

    if missing:
        print("\nInstall missing packages with:")
        print("    pip install -r requirements.txt")

    print("\nGPU check...")
    try:
        import torch

        if torch.cuda.is_available():
            print(f"  CUDA GPU available: {torch.cuda.get_device_name(0)}")
        else:
            print("  No CUDA GPU detected — backend will run in CPU mode (fully supported).")
    except ImportError:
        print("  torch not installed yet — skipping GPU check.")

    print("\n" + ("Environment looks ready." if ok else "Environment is NOT ready — see above."))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
