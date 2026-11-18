"""
Mapeo de caracteres a Sistema Braille (celda estándar de 6 puntos).

Distribución de puntos:
[P1]  [P4]
[P2]  [P5]
[P3]  [P6]

Arreglo resultante: [p1, p2, p3, p4, p5, p6] (booleanos)
"""

from typing import List

BrailleCell = List[bool]

BRAILLE_MAP: dict[str, BrailleCell] = {
    # Letras a-z
    "a": [True, False, False, False, False, False],
    "b": [True, True, False, False, False, False],
    "c": [True, False, False, True, False, False],
    "d": [True, False, False, True, True, False],
    "e": [True, False, False, False, True, False],
    "f": [True, True, False, True, False, False],
    "g": [True, True, False, True, True, False],
    "h": [True, True, False, False, True, False],
    "i": [False, True, False, True, False, False],
    "j": [False, True, False, True, True, False],
    "k": [True, False, True, False, False, False],
    "l": [True, True, True, False, False, False],
    "m": [True, False, True, True, False, False],
    "n": [True, False, True, True, True, False],
    "o": [True, False, True, False, True, False],
    "p": [True, True, True, True, False, False],
    "q": [True, True, True, True, True, False],
    "r": [True, True, True, False, True, False],
    "s": [False, True, True, True, False, False],
    "t": [False, True, True, True, True, False],
    "u": [True, False, True, False, False, True],
    "v": [True, True, True, False, False, True],
    "w": [False, True, False, True, True, True],
    "x": [True, False, True, True, False, True],
    "y": [True, False, True, True, True, True],
    "z": [True, False, True, False, True, True],
    # Caracteres españoles con tilde y letra Ñ
    "á": [True, True, True, False, True, True],
    "é": [False, True, True, False, True, True],
    "í": [False, False, True, True, False, False],
    "ó": [False, False, True, True, False, True],
    "ú": [False, True, True, True, False, True],
    "ü": [True, True, False, False, True, True],
    "ñ": [True, True, False, True, True, True],
    # Números (0-9) - Mapeo Braille estándar
    "1": [True, False, False, False, False, False],
    "2": [True, True, False, False, False, False],
    "3": [True, False, False, True, False, False],
    "4": [True, False, False, True, True, False],
    "5": [True, False, False, False, True, False],
    "6": [True, True, False, True, False, False],
    "7": [True, True, False, True, True, False],
    "8": [True, True, False, False, True, False],
    "9": [False, True, False, True, False, False],
    "0": [False, True, False, True, True, False],
    # Signos de puntuación y caracteres especiales
    " ": [False, False, False, False, False, False],
    ",": [False, True, False, False, False, False],
    ";": [False, True, True, False, False, False],
    ":": [False, True, False, False, True, False],
    ".": [False, False, True, False, False, False],
    "?": [False, True, False, False, False, True],
    "¿": [False, True, False, False, False, True],
    "!": [False, True, True, False, True, False],
    "¡": [False, True, True, False, True, False],
    '"': [False, True, True, False, False, True],
    "'": [False, False, True, False, False, False],
    "-": [False, False, True, False, False, True],
    "_": [False, False, True, False, False, True],
    "(": [True, True, False, False, False, True],
    ")": [False, False, True, True, True, False],
    "/": [False, False, True, True, False, False],
    "@": [False, False, False, True, False, True],
    "+": [False, True, True, False, True, False],
    "=": [False, True, True, False, True, True],
    "\n": [False, False, False, False, False, False],
    "\r": [False, False, False, False, False, False],
    "\t": [False, False, False, False, False, False],
}


def char_to_braille(char: str) -> BrailleCell:
    if not char:
        return [False, False, False, False, False, False]
    normalized = char.lower()
    dots = BRAILLE_MAP.get(normalized)
    if dots is not None:
        return list(dots)
    return [False, False, False, False, False, False]


def braille_to_unicode(dots: BrailleCell) -> str:
    mask = 0
    if len(dots) >= 6:
        if dots[0]:
            mask |= 0x01
        if dots[1]:
            mask |= 0x02
        if dots[2]:
            mask |= 0x04
        if dots[3]:
            mask |= 0x08
        if dots[4]:
            mask |= 0x10
        if dots[5]:
            mask |= 0x20
    return chr(0x2800 + mask)
