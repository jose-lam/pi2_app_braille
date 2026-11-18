from datetime import datetime, timezone
from typing import Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from auth import get_authenticated_esp32
from braille_tts import synthesize_char_mp3
from database import get_db
from models import Device, Room
from routers.rooms import build_braille_snapshot
from schemas import BrailleHardwareResponse

router = APIRouter(prefix="/api/braille", tags=["ESP32 Hardware Braille API"])


def _record_and_respond(
    device: Device,
    room: Room,
    client_ip: str,
    target_position: int,
    db: Session,
) -> BrailleHardwareResponse:
    snapshot = build_braille_snapshot(
        room.current_text, target_position, room.initial_position
    )

    device.current_position = snapshot.position
    device.current_char = snapshot.char
    device.last_seen = datetime.now(timezone.utc)
    device.last_ip = client_ip or device.last_ip
    db.commit()

    return BrailleHardwareResponse(
        **snapshot.model_dump(),
        syncMode=room.sync_mode,
        roomName=room.name,
        deviceName=device.name,
    )


@router.get("/estado", response_model=BrailleHardwareResponse)
def get_braille_state(
    auth_ctx: Tuple[Device, Room, str] = Depends(get_authenticated_esp32),
    db: Session = Depends(get_db),
):
    device, room, client_ip = auth_ctx
    target_pos = room.global_position if room.sync_mode else device.current_position
    return _record_and_respond(device, room, client_ip, target_pos, db)


@router.get("/inicio", response_model=BrailleHardwareResponse)
def get_braille_inicio(
    auth_ctx: Tuple[Device, Room, str] = Depends(get_authenticated_esp32),
    db: Session = Depends(get_db),
):
    device, room, client_ip = auth_ctx
    target_pos = room.global_position if room.sync_mode else room.initial_position
    return _record_and_respond(device, room, client_ip, target_pos, db)


@router.get("/siguiente", response_model=BrailleHardwareResponse)
def get_braille_siguiente(
    auth_ctx: Tuple[Device, Room, str] = Depends(get_authenticated_esp32),
    db: Session = Depends(get_db),
):
    device, room, client_ip = auth_ctx
    max_idx = max(0, len(room.current_text or "") - 1)
    if room.sync_mode:
        target_pos = room.global_position
    else:
        target_pos = min(max_idx, device.current_position + 1)
    return _record_and_respond(device, room, client_ip, target_pos, db)


@router.get("/anterior", response_model=BrailleHardwareResponse)
def get_braille_anterior(
    auth_ctx: Tuple[Device, Room, str] = Depends(get_authenticated_esp32),
    db: Session = Depends(get_db),
):
    device, room, client_ip = auth_ctx
    if room.sync_mode:
        target_pos = room.global_position
    else:
        target_pos = max(0, device.current_position - 1)
    return _record_and_respond(device, room, client_ip, target_pos, db)


@router.get("/tts")
async def get_braille_tts(
    char: str = Query(..., min_length=1, max_length=8),
):
    try:
        audio_bytes = await synthesize_char_mp3(char)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Servicio de voz HD no disponible: {exc}",
        )
