import os
from pathlib import Path
from dotenv import load_dotenv

# Locate the root .env file relative to this backend package
# backend/config.py -> parent is backend/ -> parent.parent is project root
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
ENV_PATH = PROJECT_ROOT / ".env"

if ENV_PATH.is_file():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
else:
    # Fallback to default search path
    load_dotenv(override=True)

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "lab-ppe-3ox2k/1")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_ROOT / 'smart_lab_safety.db'}")

def is_roboflow_configured() -> bool:
    """Returns True if a non-empty ROBOFLOW_API_KEY is available."""
    return bool(ROBOFLOW_API_KEY and len(ROBOFLOW_API_KEY.strip()) > 0)
