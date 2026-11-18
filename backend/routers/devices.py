import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Device, Room, User
from routers.rooms import serialize_device
from schemas import DeviceCreate, DeviceOut, DeviceUpdate

router = APIRouter(prefix="/api", tags=["ESP32 Devices"])


def _generate_device_token() -> str:
    return f"br_esp32_{secrets.token_urlsafe(24)}"


@router.get("/rooms/{room_id}/devices", response_model=List[DeviceOut])
def list_room_devices(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = (
        db.query(Room)
        .filter(Room.id == room_id, Room.tenant_id == current_user.tenant_id)
        .first()
    )
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salón no encontrado.",
        )

    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return [serialize_device(d, room.current_text) for d in devices]


@router.post(
    "/rooms/{room_id}/devices",
    response_model=DeviceOut,
    status_code=status.HTTP_201_CREATED,
)
def register_device(
    room_id: int,
    payload: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = (
        db.query(Room)
        .filter(Room.id == room_id, Room.tenant_id == current_user.tenant_id)
        .first()
    )
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salón no encontrado dentro de tu institución.",
        )

    text = room.current_text or ""
    start_pos = room.global_position if room.sync_mode else room.initial_position
    safe_pos = max(0, min(start_pos, max(0, len(text) - 1)))
    start_char = text[safe_pos] if text else ""

    device = Device(
        tenant_id=current_user.tenant_id,
        room_id=room.id,
        name=payload.name.strip(),
        device_token=_generate_device_token(),
        current_position=safe_pos,
        current_char=start_char,
        is_active=True,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return serialize_device(device, room.current_text)


@router.patch("/devices/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: int,
    payload: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id, Device.tenant_id == current_user.tenant_id)
        .first()
    )
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo ESP32 no encontrado.",
        )

    if payload.name is not None:
        device.name = payload.name.strip()
    if payload.is_active is not None:
        device.is_active = payload.is_active
    if payload.rotate_token:
        device.device_token = _generate_device_token()

    db.commit()
    db.refresh(device)

    room = db.query(Room).filter(Room.id == device.room_id).first()
    return serialize_device(device, room.current_text if room else "")


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = (
        db.query(Device)
        .filter(Device.id == device_id, Device.tenant_id == current_user.tenant_id)
        .first()
    )
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo ESP32 no encontrado.",
        )
    db.delete(device)
    db.commit()
    return None
