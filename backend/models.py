from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="tenant", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(160), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="admin", nullable=False)  # admin | docente
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    tenant = relationship("Tenant", back_populates="users")


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_room_tenant_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    description = Column(String(255), default="", nullable=False)
    wifi_ssid = Column(String(120), default="", nullable=False)

    # Seguridad de red del salón y Computadora Global vinculada
    allowed_public_ip = Column(String(64), nullable=True)
    strict_ip_check = Column(Boolean, default=False, nullable=False)
    global_session_id = Column(String(128), nullable=True)
    global_computer_label = Column(String(120), nullable=True)
    global_last_seen = Column(DateTime(timezone=True), nullable=True)

    # Contenido y estado de lectura del salón
    current_text = Column(Text, default="HOLA MUNDO BRAILLE ESP32", nullable=False)
    filename = Column(String(255), default="bienvenida.txt", nullable=False)
    initial_position = Column(Integer, default=0, nullable=False)
    global_position = Column(Integer, default=0, nullable=False)
    sync_mode = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    tenant = relationship("Tenant", back_populates="rooms")
    devices = relationship(
        "Device", back_populates="room", cascade="all, delete-orphan"
    )


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(120), nullable=False)
    device_token = Column(String(128), unique=True, index=True, nullable=False)

    # Puntero independiente y telemetría en vivo
    current_position = Column(Integer, default=0, nullable=False)
    current_char = Column(String(16), default="", nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    last_ip = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    tenant = relationship("Tenant", back_populates="devices")
    room = relationship("Room", back_populates="devices")
