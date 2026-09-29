from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import User
from app.models.enums import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exc
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exc
    user = db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise credentials_exc
    return user


def require_roles(*roles: UserRole) -> Callable[..., User]:
    allowed = {r.value for r in roles}

    def _dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return _dep


require_citizen = require_roles(UserRole.CITIZEN)
require_officer = require_roles(UserRole.OFFICER, UserRole.ADMIN)
require_admin = require_roles(UserRole.ADMIN)
