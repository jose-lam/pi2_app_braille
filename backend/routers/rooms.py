from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from auth import get_client_ip, get_current_user
from braille_map import braille_to_unicode, char_to_braille
from database import get_db
from models import Device, Room, User
from schemas import (
    BrailleSnapshot,
    DeviceOut,
    RoomCreate,
    RoomDetailOut,
    RoomLinkGlobalRequest,
    RoomSetPositionRequest,
    RoomSummaryOut,
    RoomTextUpdate,
    RoomUpdate,
)

router = APIRouter(prefix="/api/rooms", tags=["Rooms & Global Computer"])


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def build_braille_snapshot(
    text: str, position: int, initial_position: int
) -> BrailleSnapshot:
    safe_text = text or ""
    total_len = len(safe_text)
    safe_pos = max(0, min(position, total_len - 1)) if total_len > 0 else 0
    safe_init = max(0, min(initial_position, total_len - 1)) if total_len > 0 else 0
    char = safe_text[safe_pos] if total_len > 0 else ""
    dots = char_to_braille(char)
    return BrailleSnapshot(
        char=char,
        position=safe_pos,
        braille=dots,
        totalLength=total_len,
        posicion_inicial=safe_init,
        unicodeBraille=braille_to_unicode(dots),
        hasNext=safe_pos < total_len - 1,
        hasPrev=safe_pos > 0,
    )


def serialize_device(device: Device, room_text: str) -> DeviceOut:
    now = datetime.now(timezone.utc)
    last_seen = _ensure_utc(device.last_seen)
    is_online = bool(
        device.is_active
        and last_seen is not None
        and (now - last_seen) <= timedelta(seconds=60)
    )
    total_len = len(room_text or "")
    pos = max(0, min(device.current_position, total_len - 1)) if total_len > 0 else 0
    char = room_text[pos] if total_len > 0 else ""
    dots = char_to_braille(char)

    return DeviceOut(
        id=device.id,
        tenant_id=device.tenant_id,
        room_id=device.room_id,
        name=device.name,
        device_token=device.device_token,
        current_position=pos,
        current_char=device.current_char or char,
        braille=dots,
        unicode_braille=braille_to_unicode(dots),
        last_seen=last_seen,
        last_ip=device.last_ip,
        is_online=is_online,
        is_active=device.is_active,
        created_at=device.created_at,
    )


def serialize_room_summary(room: Room, devices: List[Device]) -> RoomSummaryOut:
    now = datetime.now(timezone.utc)
    global_last_seen = _ensure_utc(room.global_last_seen)
    global_online = bool(
        room.global_session_id
        and global_last_seen is not None
        and (now - global_last_seen) <= timedelta(seconds=45)
    )
    online_count = 0
    for d in devices:
        ls = _ensure_utc(d.last_seen)
        if d.is_active and ls is not None and (now - ls) <= timedelta(seconds=60):
            online_count += 1

    return RoomSummaryOut(
        id=room.id,
        tenant_id=room.tenant_id,
        name=room.name,
        description=room.description,
        wifi_ssid=room.wifi_ssid,
        allowed_public_ip=room.allowed_public_ip,
        strict_ip_check=room.strict_ip_check,
        global_session_id=room.global_session_id,
        global_computer_label=room.global_computer_label,
        global_last_seen=global_last_seen,
        global_online=global_online,
        filename=room.filename,
        sync_mode=room.sync_mode,
        total_length=len(room.current_text or ""),
        global_position=room.global_position,
        device_count=len(devices),
        online_device_count=online_count,
        updated_at=room.updated_at,
    )


def serialize_room_detail(room: Room, devices: List[Device]) -> RoomDetailOut:
    summary = serialize_room_summary(room, devices)
    snapshot = build_braille_snapshot(
        room.current_text, room.global_position, room.initial_position
    )
    return RoomDetailOut(
        **summary.model_dump(),
        current_text=room.current_text,
        initial_position=room.initial_position,
        braille_state=snapshot,
        devices=[serialize_device(d, room.current_text) for d in devices],
    )


def _get_tenant_room(room_id: int, tenant_id: int, db: Session) -> Room:
    room = (
        db.query(Room)
        .filter(Room.id == room_id, Room.tenant_id == tenant_id)
        .first()
    )
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salón no encontrado dentro de tu institución.",
        )
    return room


@router.get("", response_model=List[RoomSummaryOut])
def list_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rooms = (
        db.query(Room)
        .filter(Room.tenant_id == current_user.tenant_id)
        .order_by(Room.id.asc())
        .all()
    )
    devices_all = (
        db.query(Device)
        .filter(Device.tenant_id == current_user.tenant_id)
        .all()
    )
    devices_by_room: dict[int, List[Device]] = {}
    for d in devices_all:
        devices_by_room.setdefault(d.room_id, []).append(d)

    return [
        serialize_room_summary(room, devices_by_room.get(room.id, []))
        for room in rooms
    ]


@router.post("", response_model=RoomDetailOut, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Room)
        .filter(
            Room.tenant_id == current_user.tenant_id,
            Room.name == payload.name.strip(),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un salón con ese nombre en tu institución.",
        )

    room = Room(
        tenant_id=current_user.tenant_id,
        name=payload.name.strip(),
        description=payload.description.strip(),
        wifi_ssid=payload.wifi_ssid.strip(),
        strict_ip_check=payload.strict_ip_check,
        current_text="HOLA MUNDO BRAILLE ESP32",
        filename="bienvenida.txt",
        initial_position=0,
        global_position=0,
        sync_mode=False,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return serialize_room_detail(room, [])


@router.get("/{room_id}", response_model=RoomDetailOut)
def get_room_detail(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)


@router.patch("/{room_id}", response_model=RoomDetailOut)
def update_room(
    room_id: int,
    payload: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)

    if payload.name is not None:
        room.name = payload.name.strip()
    if payload.description is not None:
        room.description = payload.description.strip()
    if payload.wifi_ssid is not None:
        room.wifi_ssid = payload.wifi_ssid.strip()
    if payload.allowed_public_ip is not None:
        room.allowed_public_ip = payload.allowed_public_ip.strip() or None
    if payload.strict_ip_check is not None:
        room.strict_ip_check = payload.strict_ip_check
    if payload.sync_mode is not None:
        room.sync_mode = payload.sync_mode
        if room.sync_mode:
            # Al activar Modo Sincronizado, alinear todos los ESP32 del salón al puntero global
            text = room.current_text or ""
            pos = max(0, min(room.global_position, max(0, len(text) - 1)))
            char = text[pos] if text else ""
            db.query(Device).filter(
                Device.room_id == room.id,
                Device.tenant_id == current_user.tenant_id,
            ).update(
                {"current_position": pos, "current_char": char},
                synchronize_session=False,
            )

    db.commit()
    db.refresh(room)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    db.delete(room)
    db.commit()
    return None


@router.post("/{room_id}/link-global", response_model=RoomDetailOut)
def link_global_computer(
    room_id: int,
    payload: RoomLinkGlobalRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    client_ip = get_client_ip(request)

    room.global_session_id = payload.session_id.strip()
    room.global_computer_label = payload.computer_label.strip() or "Computadora Global"
    room.global_last_seen = datetime.now(timezone.utc)
    if client_ip:
        room.allowed_public_ip = client_ip

    db.commit()
    db.refresh(room)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)


@router.post("/{room_id}/heartbeat")
def global_computer_heartbeat(
    room_id: int,
    payload: RoomLinkGlobalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    if room.global_session_id == payload.session_id.strip():
        room.global_last_seen = datetime.now(timezone.utc)
        db.commit()
        return {"linked": True, "global_last_seen": room.global_last_seen}
    return {
        "linked": False,
        "active_session_id": room.global_session_id,
        "active_label": room.global_computer_label,
    }


def _apply_room_text(
    room: Room,
    text: str,
    filename: str,
    initial_position: int,
    db: Session,
) -> None:
    clean_text = text if len(text) > 0 else " "
    max_idx = max(0, len(clean_text) - 1)
    safe_init = max(0, min(initial_position, max_idx))

    room.current_text = clean_text
    room.filename = (filename or "documento.txt").strip()[:255]
    room.initial_position = safe_init
    room.global_position = safe_init
    room.updated_at = datetime.now(timezone.utc)

    init_char = clean_text[safe_init] if clean_text else ""
    db.query(Device).filter(
        Device.room_id == room.id, Device.tenant_id == room.tenant_id
    ).update(
        {"current_position": safe_init, "current_char": init_char},
        synchronize_session=False,
    )


@router.post("/{room_id}/text", response_model=RoomDetailOut)
def update_room_text(
    room_id: int,
    payload: RoomTextUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    _apply_room_text(
        room, payload.text, payload.filename, payload.initial_position, db
    )
    db.commit()
    db.refresh(room)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)


@router.post("/{room_id}/upload", response_model=RoomDetailOut)
async def upload_room_txt_file(
    room_id: int,
    file: UploadFile = File(...),
    posicion_inicial: int = Form(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    filename = file.filename or "documento.txt"
    if not filename.lower().endswith(".txt") and file.content_type != "text/plain":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos de texto plano (.txt).",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo excede el límite máximo de 5 MB.",
        )

    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = raw_bytes.decode("latin-1", errors="replace")

    _apply_room_text(room, content, filename, posicion_inicial, db)
    db.commit()
    db.refresh(room)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)


@router.post("/{room_id}/control/{action}", response_model=RoomDetailOut)
def control_room_reading(
    room_id: int,
    action: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    text = room.current_text or ""
    max_idx = max(0, len(text) - 1)

    if action == "inicio":
        room.global_position = max(0, min(room.initial_position, max_idx))
    elif action == "siguiente":
        room.global_position = min(max_idx, room.global_position + 1)
    elif action == "anterior":
        room.global_position = max(0, room.global_position - 1)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acción inválida. Usa inicio, siguiente o anterior.",
        )

    room.global_last_seen = datetime.now(timezone.utc)

    if room.sync_mode:
        char = text[room.global_position] if text else ""
        db.query(Device).filter(
            Device.room_id == room.id, Device.tenant_id == current_user.tenant_id
        ).update(
            {"current_position": room.global_position, "current_char": char},
            synchronize_session=False,
        )

    db.commit()
    db.refresh(room)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)


@router.post("/{room_id}/set-position", response_model=RoomDetailOut)
def set_room_position(
    room_id: int,
    payload: RoomSetPositionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    room = _get_tenant_room(room_id, current_user.tenant_id, db)
    text = room.current_text or ""
    max_idx = max(0, len(text) - 1)
    room.global_position = max(0, min(payload.position, max_idx))
    room.global_last_seen = datetime.now(timezone.utc)

    if room.sync_mode:
        char = text[room.global_position] if text else ""
        db.query(Device).filter(
            Device.room_id == room.id, Device.tenant_id == current_user.tenant_id
        ).update(
            {"current_position": room.global_position, "current_char": char},
            synchronize_session=False,
        )

    db.commit()
    db.refresh(room)
    devices = (
        db.query(Device)
        .filter(Device.room_id == room.id, Device.tenant_id == current_user.tenant_id)
        .order_by(Device.id.asc())
        .all()
    )
    return serialize_room_detail(room, devices)
