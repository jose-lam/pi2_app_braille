import re
import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import create_access_token, get_current_user, hash_password, verify_password
from database import get_db
from models import Room, Tenant, User
from schemas import (
    LoginRequest,
    TenantOut,
    TenantRegisterRequest,
    TokenResponse,
    UserCreateRequest,
    UserOut,
)

router = APIRouter(prefix="/api", tags=["Tenants & Auth"])


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or f"institucion-{secrets.token_hex(3)}"


@router.post(
    "/auth/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_tenant(payload: TenantRegisterRequest, db: Session = Depends(get_db)):
    existing_user = (
        db.query(User).filter(User.email == payload.email.lower()).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta registrada con ese correo electrónico.",
        )

    base_slug = _slugify(payload.tenant_name)
    slug = base_slug
    if db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{secrets.token_hex(2)}"

    tenant = Tenant(name=payload.tenant_name.strip(), slug=slug)
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Salón inicial listo para operar
    default_room = Room(
        tenant_id=tenant.id,
        name="Aula 101",
        description="Salón principal de lectura Braille",
        wifi_ssid="",
        current_text="HOLA MUNDO BRAILLE ESP32",
        filename="bienvenida.txt",
        initial_position=0,
        global_position=0,
        sync_mode=False,
    )
    db.add(default_room)
    db.commit()
    db.refresh(tenant)
    db.refresh(user)

    token = create_access_token(user_id=user.id, tenant_id=tenant.id, role=user.role)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
        tenant=TenantOut.model_validate(tenant),
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas. Verifica tu correo y contraseña.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu usuario ha sido desactivado por el administrador.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La institución asociada no existe.",
        )

    token = create_access_token(user_id=user.id, tenant_id=tenant.id, role=user.role)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
        tenant=TenantOut.model_validate(tenant),
    )


@router.get("/auth/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    return {
        "user": UserOut.model_validate(current_user),
        "tenant": TenantOut.model_validate(tenant),
    }


@router.get("/tenants/users", response_model=List[UserOut])
def list_tenant_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .filter(User.tenant_id == current_user.tenant_id)
        .order_by(User.created_at.asc())
        .all()
    )
    return [UserOut.model_validate(u) for u in users]


@router.post(
    "/tenants/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def create_tenant_user(
    payload: UserCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador de la institución puede crear usuarios.",
        )

    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo electrónico ya está registrado en la plataforma.",
        )

    new_user = User(
        tenant_id=current_user.tenant_id,
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserOut.model_validate(new_user)
