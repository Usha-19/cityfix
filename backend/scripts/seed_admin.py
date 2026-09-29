"""Securely seed the admin account from environment variables.

Never allow public registration to create admins. This script is the only
sanctioned path to create the first admin.
"""
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User
from app.models.enums import UserRole


def seed_admin() -> None:
    db = SessionLocal()
    try:
        email = settings.admin_seed_email.lower()
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Admin already exists: {email}")
            return
        admin = User(
            email=email,
            hashed_password=hash_password(settings.admin_seed_password),
            full_name=settings.admin_seed_name,
            role=UserRole.ADMIN.value,
        )
        db.add(admin)
        db.commit()
        print(f"Seeded admin: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
