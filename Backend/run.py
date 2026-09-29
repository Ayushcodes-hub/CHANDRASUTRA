#!/usr/bin/env python3
"""
LUNAR-X / LUNARIS backend launcher.

This is the single entry point for running the FastAPI backend that the
LunarMatch frontend talks to. It wraps `uvicorn app.main:app` so the whole
project can be started with one simple command:

    python run.py

Environment variables (all optional, read from `backend/.env` if present):
    HOST            - interface to bind to (default: 0.0.0.0)
    PORT            - port to bind to (default: 8000)
    RELOAD          - "true"/"false", enables autoreload for development (default: true)
    CORS_ORIGINS    - comma-separated list of allowed frontend origins
                       (default already includes http://localhost:3000, which is
                       the port the LunarMatch frontend runs on)

The frontend (lunarmatch) expects this backend to be reachable at
http://localhost:8000 by default — see frontend/.env.local (BACKEND_API_URL).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


def main() -> None:
    # Make sure `backend/` is on sys.path so `import app...` works no matter
    # where this script is invoked from.
    backend_dir = Path(__file__).resolve().parent / "backend"
    if not backend_dir.exists():
        print(f"ERROR: expected a 'backend' directory at {backend_dir}, not found.")
        sys.exit(1)
    sys.path.insert(0, str(backend_dir))
    os.chdir(backend_dir)

    try:
        import uvicorn
    except ImportError:
        print("ERROR: uvicorn is not installed. Run:")
        print("    pip install -r requirements.txt")
        sys.exit(1)

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    reload = os.environ.get("RELOAD", "true").lower() in ("1", "true", "yes")

    print("=" * 70)
    print(" LUNAR-X / LUNARIS backend")
    print(f"   Serving on:      http://{host}:{port}")
    print(f"   API docs:        http://localhost:{port}/docs")
    print(f"   Health check:    http://localhost:{port}/api/health")
    print("   Expects frontend (lunarmatch) running at http://localhost:3000")
    print("=" * 70)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        app_dir=str(backend_dir),
    )


if __name__ == "__main__":
    main()
