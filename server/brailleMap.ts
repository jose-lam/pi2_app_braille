/**
 * Mapeo de caracteres a Sistema Braille (celda estándar de 6 puntos).
 * 
 * Distribución de puntos:
 * [P1]  [P4]
 * [P2]  [P5]
 * [P3]  [P6]
 * 
 * Arreglo resultante: [p1, p2, p3, p4, p5, p6] (booleanos)
 */

export type BrailleCell = [boolean, boolean, boolean, boolean, boolean, boolean];

// Diccionario base de caracteres a celdas Braille estándar (Grado 1 en Español)
export const BRAILLE_MAP: Record<string, BrailleCell> = {
  // Letras minúsculas / mayúsculas (A-Z)
  'a': [true, false, false, false, false, false],  // Punto 1
  'b': [true, true, false, false, false, false],   // Puntos 1, 2
  'c': [true, false, false, true, false, false],  // Puntos 1, 4
  'd': [true, false, false, true, true, false],   // Puntos 1, 4, 5
  'e': [true, false, false, false, true, false],  // Puntos 1, 5
  'f': [true, true, false, true, false, false],   // Puntos 1, 2, 4
  'g': [true, true, false, true, true, false],    // Puntos 1, 2, 4, 5
  'h': [true, true, false, false, true, false],   // Puntos 1, 2, 5
  'i': [false, true, false, true, false, false],  // Puntos 2, 4
  'j': [false, true, false, true, true, false],   // Puntos 2, 4, 5
  'k': [true, false, true, false, false, false],  // Puntos 1, 3
  'l': [true, true, true, false, false, false],   // Puntos 1, 2, 3
  'm': [true, false, true, true, false, false],   // Puntos 1, 3, 4
  'n': [true, false, true, true, true, false],    // Puntos 1, 3, 4, 5
  'o': [true, false, true, false, true, false],   // Puntos 1, 3, 5
  'p': [true, true, true, true, false, false],    // Puntos 1, 2, 3, 4
  'q': [true, true, true, true, true, false],     // Puntos 1, 2, 3, 4, 5
  'r': [true, true, true, false, true, false],    // Puntos 1, 2, 3, 5
  's': [false, true, true, true, false, false],   // Puntos 2, 3, 4
  't': [false, true, true, true, true, false],    // Puntos 2, 3, 4, 5
  'u': [true, false, true, false, false, true],   // Puntos 1, 3, 6
  'v': [true, true, true, false, false, true],    // Puntos 1, 2, 3, 6
  'w': [false, true, false, true, true, true],    // Puntos 2, 4, 5, 6
  'x': [true, false, true, true, false, true],    // Puntos 1, 3, 4, 6
  'y': [true, false, true, true, true, true],     // Puntos 1, 3, 4, 5, 6
  'z': [true, false, true, false, true, true],    // Puntos 1, 3, 5, 6

  // Caracteres españoles con tilde y letra Ñ
  'á': [true, true, true, false, true, true],     // Puntos 1, 2, 3, 5, 6
  'é': [false, true, true, false, true, true],    // Puntos 2, 3, 5, 6
  'í': [false, false, true, true, false, false],   // Puntos 3, 4
  'ó': [false, false, true, true, false, true],    // Puntos 3, 4, 6
  'ú': [false, true, true, true, false, true],    // Puntos 2, 3, 4, 6
  'ü': [true, true, false, false, true, true],    // Puntos 1, 2, 5, 6
  'ñ': [true, true, false, true, true, true],     // Puntos 1, 2, 4, 5, 6

  // Números (0-9) - Mapeo Braille estándar (equivalente a letras A-J)
  '1': [true, false, false, false, false, false],  // Punto 1
  '2': [true, true, false, false, false, false],   // Puntos 1, 2
  '3': [true, false, false, true, false, false],  // Puntos 1, 4
  '4': [true, false, false, true, true, false],   // Puntos 1, 4, 5
  '5': [true, false, false, false, true, false],  // Puntos 1, 5
  '6': [true, true, false, true, false, false],   // Puntos 1, 2, 4
  '7': [true, true, false, true, true, false],    // Puntos 1, 2, 4, 5
  '8': [true, true, false, false, true, false],   // Puntos 1, 2, 5
  '9': [false, true, false, true, false, false],  // Puntos 2, 4
  '0': [false, true, false, true, true, false],   // Puntos 2, 4, 5

  // Signos de puntuación y caracteres especiales
  ' ': [false, false, false, false, false, false], // Espacio en blanco (todos apagados)
  ',': [false, true, false, false, false, false],  // Punto 2
  ';': [false, true, true, false, false, false],   // Puntos 2, 3
  ':': [false, true, false, false, true, false],   // Puntos 2, 5
  '.': [false, false, true, false, false, false],  // Punto 3
  '?': [false, true, false, false, false, true],   // Puntos 2, 6
  '¿': [false, true, false, false, false, true],   // Puntos 2, 6
  '!': [false, true, true, false, true, false],    // Puntos 2, 3, 5
  '¡': [false, true, true, false, true, false],    // Puntos 2, 3, 5
  '"': [false, true, true, false, false, true],    // Puntos 2, 3, 6
  '\'': [false, false, true, false, false, false], // Punto 3
  '-': [false, false, true, false, false, true],   // Puntos 3, 6
  '_': [false, false, true, false, false, true],   // Puntos 3, 6
  '(': [true, true, false, false, false, true],    // Puntos 1, 2, 6
  ')': [false, false, true, true, true, false],    // Puntos 3, 4, 5
  '/': [false, false, true, true, false, false],   // Puntos 3, 4
  '@': [false, false, false, true, false, true],   // Puntos 4, 6
  '+': [false, true, true, false, true, false],    // Puntos 2, 3, 5
  '=': [false, true, true, false, true, true],     // Puntos 2, 3, 5, 6
  '\n': [false, false, false, false, false, false],// Salto de línea
  '\r': [false, false, false, false, false, false],// Retorno
  '\t': [false, false, false, false, false, false] // Tabulación
};

/**
 * Transforma un carácter individual a un arreglo de 6 valores booleanos [p1, p2, p3, p4, p5, p6].
 * @param char Carácter de entrada (longitud 1)
 * @returns Arreglo con 6 booleanos indicando el estado de cada punto Braille
 */
export function charToBraille(char: string): BrailleCell {
  if (!char || char.length === 0) {
    return [false, false, false, false, false, false];
  }

  // Normalizar a minúscula para la búsqueda
  const normalizedChar = char.toLowerCase();

  // Si existe en el mapa, retornarlo
  if (BRAILLE_MAP[normalizedChar]) {
    return [...BRAILLE_MAP[normalizedChar]] as BrailleCell;
  }

  // Fallback para caracteres no mapeados: todos apagados
  return [false, false, false, false, false, false];
}

/**
 * Convierte un arreglo de 6 booleanos al carácter Unicode correspondiente del bloque Braille (U+2800..U+283F).
 * La fórmula estándar de Unicode Braille asigna:
 * Dot 1 -> 0x01
 * Dot 2 -> 0x02
 * Dot 3 -> 0x04
 * Dot 4 -> 0x08
 * Dot 5 -> 0x10
 * Dot 6 -> 0x20
 */
export function brailleToUnicode(dots: BrailleCell): string {
  let mask = 0;
  if (dots[0]) mask |= 0x01;
  if (dots[1]) mask |= 0x02;
  if (dots[2]) mask |= 0x04;
  if (dots[3]) mask |= 0x08;
  if (dots[4]) mask |= 0x10;
  if (dots[5]) mask |= 0x20;

  return String.fromCharCode(0x2800 + mask);
}
