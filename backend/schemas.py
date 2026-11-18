from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# ==========================================
# TENANT & AUTH SCHEMAS
# ==========================================
class TenantRegisterRequest(BaseModel):
    tenant_name: str = Field(..., min_length=2, max_length=160)
    full_name: str = Field(..., min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserCreateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field(default="docente", pattern="^(admin|docente)$")


class TenantOut(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    tenant_id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    tenant: TenantOut


# ==========================================
# DEVICE (ESP32) SCHEMAS
# ==========================================
class DeviceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    is_active: Optional[bool] = None
    rotate_token: Optional[bool] = False


class DeviceOut(BaseModel):
    id: int
    tenant_id: int
    room_id: int
    name: str
    device_token: str
    current_position: int
    current_char: str
    braille: List[bool]
    unicode_braille: str
    last_seen: Optional[datetime] = None
    last_ip: Optional[str] = None
    is_online: bool
    is_active: bool
    created_at: datetime


# ==========================================
# ROOM (SALÓN) & GLOBAL COMPUTER SCHEMAS
# ==========================================
class RoomCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str = Field(default="", max_length=255)
    wifi_ssid: str = Field(default="", max_length=120)
    strict_ip_check: bool = False


class RoomUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=255)
    wifi_ssid: Optional[str] = Field(default=None, max_length=120)
    allowed_public_ip: Optional[str] = Field(default=None, max_length=64)
    strict_ip_check: Optional[bool] = None
    sync_mode: Optional[bool] = None


class RoomLinkGlobalRequest(BaseModel):
    session_id: str = Field(..., min_length=6, max_length=128)
    computer_label: str = Field(default="Computadora Principal", max_length=120)


class RoomTextUpdate(BaseModel):
    text: str = Field(..., min_length=1)
    filename: str = Field(default="texto_salon.txt", max_length=255)
    initial_position: int = Field(default=0, ge=0)


class RoomSetPositionRequest(BaseModel):
    position: int = Field(..., ge=0)


class BrailleSnapshot(BaseModel):
    char: str
    position: int
    braille: List[bool]
    totalLength: int
    posicion_inicial: int
    unicodeBraille: str
    hasNext: bool
    hasPrev: bool


class RoomSummaryOut(BaseModel):
    id: int
    tenant_id: int
    name: str
    description: str
    wifi_ssid: str
    allowed_public_ip: Optional[str] = None
    strict_ip_check: bool
    global_session_id: Optional[str] = None
    global_computer_label: Optional[str] = None
    global_last_seen: Optional[datetime] = None
    global_online: bool
    filename: str
    sync_mode: bool
    total_length: int
    global_position: int
    device_count: int
    online_device_count: int
    updated_at: datetime


class RoomDetailOut(RoomSummaryOut):
    current_text: str
    initial_position: int
    braille_state: BrailleSnapshot
    devices: List[DeviceOut]


# ==========================================
# HARDWARE ESP32 /api/braille/* RESPONSE
# ==========================================
class BrailleHardwareResponse(BrailleSnapshot):
    syncMode: bool
    roomName: str
    deviceName: str
