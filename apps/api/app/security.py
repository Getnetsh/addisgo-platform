from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .supabase_client import get_supabase

bearer_scheme = HTTPBearer()


def current_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> str:
    """Validate the Supabase JWT remotely; never trust a user id sent by a client."""
    try:
        response = get_supabase().auth.get_user(credentials.credentials)
        if response.user is None:
            raise ValueError("User not found")
        return str(response.user.id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
