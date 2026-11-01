from fastapi import HTTPException, status
import sys
from pathlib import Path

# The project keeps its Python dependencies locally for easy setup on Windows.
LOCAL_SITE_PACKAGES = Path(__file__).resolve().parent.parent / "site-packages"
if str(LOCAL_SITE_PACKAGES) not in sys.path:
    sys.path.insert(0, str(LOCAL_SITE_PACKAGES))

from supabase import Client, create_client

from .config import get_settings


def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase has not been configured on the API server.",
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
