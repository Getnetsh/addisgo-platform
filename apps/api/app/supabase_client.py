from fastapi import HTTPException, status
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
