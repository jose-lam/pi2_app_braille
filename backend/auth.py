import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import bcrypt
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import Device, Room, User

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "dev_only_change_in_production_64char_secret_key_braille_saas_2026",
)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(user_id: int, tenant_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        raw_ip = forwarded_for.split(",")[0].strip()
    else:
        raw_ip = request.headers.get("x-real-ip") or (
            request.client.host if request.client else ""
        )

    raw_ip = (raw_ip or "").strip()
    if raw_ip.startswith("::ffff:"):
        raw_ip = raw_ip.replace("::ffff:", "", 1)
    return raw_ip


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta token de autenticación JWT.",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        tenant_id = payload.get("tenant_id")
        if sub is None or tenant_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token JWT inválido o incompleto.",
            )
        user_id = int(sub)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o token JWT inválido.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id, User.tenant_id == int(tenant_id))
        .first()
    )
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o desactivado.",
        )
    return user


def get_authenticated_esp32(
    request: Request,
    x_esp32_token: Optional[str] = Header(default=None, alias="X-ESP32-Token"),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> Tuple[Device, Room, str]:
    token = (x_esp32_token or x_api_key or "").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el encabezado obligatorio X-ESP32-Token.",
        )

    device = db.query(Device).filter(Device.device_token == token).first()
    if not device or not device.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de dispositivo ESP32 inválido o deshabilitado.",
        )

    room = (
        db.query(Room)
        .filter(Room.id == device.room_id, Room.tenant_id == device.tenant_id)
        .first()
    )
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El salón asociado a este dispositivo ya no existe.",
        )

    client_ip = get_client_ip(request)
    if room.strict_ip_check and room.allowed_public_ip:
        allowed_ip = room.allowed_public_ip.strip()
        if allowed_ip and allowed_ip != "*" and client_ip != allowed_ip:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acceso denegado por restricción de red del salón '{room.name}'. "
                    f"IP origen ({client_ip}) no coincide con IP autorizada ({allowed_ip})."
                ),
            )

    return device, room, client_ip
