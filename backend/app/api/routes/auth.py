from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.main_limiter import limiter
from app.models import User
from app.models.enums import UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.audit import log_action

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute")
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Public registration is ALWAYS citizen. Officer/admin are seeded/assigned only.
    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.CITIZEN.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, user.id, "auth.register", "user", user.id)

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    log_action(db, user.id, "auth.login", "user", user.id)
    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # Stateless JWT; client discards token. Endpoint exists for symmetry/audit.
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
