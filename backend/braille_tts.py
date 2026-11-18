import asyncio
import hashlib
from pathlib import Path
from typing import Dict

import edge_tts

TTS_CACHE_DIR = Path("/tmp/braille_tts")
TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

PRIMARY_VOICE = "es-PE-CamilaNeural"
FALLBACK_VOICE = "es-MX-DaliaNeural"

PHONETIC_MAP_ES: Dict[str, str] = {
    # Vocales sin tilde
    "a": "a",
    "e": "e",
    "i": "i",
    "o": "o",
    "u": "u",
    # Vocales con tilde y diéresis
    "á": "a con tilde",
    "é": "e con tilde",
    "í": "i con tilde",
    "ó": "o con tilde",
    "ú": "u con tilde",
    "ü": "u con diéresis",
    # Consonantes
    "b": "be",
    "c": "ce",
    "d": "de",
    "f": "efe",
    "g": "ge",
    "h": "ache",
    "j": "jota",
    "k": "ka",
    "l": "ele",
    "m": "eme",
    "n": "ene",
    "ñ": "eñe",
    "p": "pe",
    "q": "cu",
    "r": "erre",
    "s": "ese",
    "t": "te",
    "v": "uve",
    "w": "doble uve",
    "x": "equis",
    "y": "i griega",
    "z": "zeta",
    # Números
    "0": "cero",
    "1": "uno",
    "2": "dos",
    "3": "tres",
    "4": "cuatro",
    "5": "cinco",
    "6": "seis",
    "7": "siete",
    "8": "ocho",
    "9": "nueve",
    # Signos y espacios
    " ": "espacio",
    ".": "punto",
    ",": "coma",
    ";": "punto y coma",
    ":": "dos puntos",
    "?": "signo de interrogación",
    "¿": "signo de apertura de interrogación",
    "!": "signo de exclamación",
    "¡": "signo de apertura de exclamación",
    "-": "guion",
    "_": "guion bajo",
    '"': "comillas",
    "'": "apóstrofo",
    "(": "abrir paréntesis",
    ")": "cerrar paréntesis",
    "/": "barra",
    "@": "arroba",
    "+": "más",
    "=": "igual",
    "\n": "salto de línea",
    "\r": "retorno de carro",
    "\t": "tabulación",
}

_MEMORY_AUDIO_CACHE: Dict[str, bytes] = {}
_SYNTHESIS_LOCKS: Dict[str, asyncio.Lock] = {}


def get_spanish_phonetic_text(char: str) -> str:
    if not char:
        return "espacio"
    target = char[0].lower()
    return PHONETIC_MAP_ES.get(target, char[0])


async def _generate_edge_tts_mp3(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text=text, voice=voice)
    chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            chunks.extend(chunk["data"])
    if not chunks:
        raise RuntimeError(f"edge-tts devolvió audio vacío para voz {voice}")
    return bytes(chunks)


async def synthesize_char_mp3(char: str) -> bytes:
    spoken_text = get_spanish_phonetic_text(char)
    cache_key = hashlib.sha256(spoken_text.encode("utf-8")).hexdigest()

    if cache_key in _MEMORY_AUDIO_CACHE:
        return _MEMORY_AUDIO_CACHE[cache_key]

    disk_path = TTS_CACHE_DIR / f"{cache_key}.mp3"
    if disk_path.exists():
        data = disk_path.read_bytes()
        if data:
            _MEMORY_AUDIO_CACHE[cache_key] = data
            return data

    lock = _SYNTHESIS_LOCKS.setdefault(cache_key, asyncio.Lock())
    async with lock:
        if cache_key in _MEMORY_AUDIO_CACHE:
            return _MEMORY_AUDIO_CACHE[cache_key]
        if disk_path.exists():
            data = disk_path.read_bytes()
            if data:
                _MEMORY_AUDIO_CACHE[cache_key] = data
                return data

        last_error: Exception | None = None
        for voice in (PRIMARY_VOICE, FALLBACK_VOICE):
            try:
                audio_bytes = await _generate_edge_tts_mp3(spoken_text, voice)
                _MEMORY_AUDIO_CACHE[cache_key] = audio_bytes
                disk_path.write_bytes(audio_bytes)
                return audio_bytes
            except Exception as exc:
                last_error = exc

        raise RuntimeError(
            f"No se pudo sintetizar audio TTS con ninguna voz disponible: {last_error}"
        )
