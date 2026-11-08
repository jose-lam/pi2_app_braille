import fs from 'fs';
import path from 'path';
import { charToBraille, brailleToUnicode, BrailleCell } from './brailleMap';

export interface BrailleResponse {
  char: string;
  position: number;
  braille: BrailleCell;
  totalLength: number;
  posicion_inicial: number;
  unicodeBraille: string;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReadingState {
  currentText: string;
  filename: string;
  posicion_inicial: number;
  posicion_actual: number;
  updatedAt: string;
}

// Directorio de uploads local
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CONFIG_FILE = path.join(UPLOADS_DIR, 'braille_state.json');

// Asegurar que la carpeta /uploads exista al inicio
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Texto por defecto inicial para prototipado rápido
const DEFAULT_TEXT = 'HOLA MUNDO ESP32 BRAILLE 123';

// Estado en memoria
let state: ReadingState = {
  currentText: DEFAULT_TEXT,
  filename: 'ejemplo_inicial.txt',
  posicion_inicial: 0,
  posicion_actual: 0,
  updatedAt: new Date().toISOString(),
};

// Cargar estado previo si existe en disco
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.currentText === 'string') {
      state = {
        currentText: parsed.currentText,
        filename: parsed.filename || 'archivo.txt',
        posicion_inicial: typeof parsed.posicion_inicial === 'number' ? parsed.posicion_inicial : 0,
        posicion_actual: typeof parsed.posicion_actual === 'number' ? parsed.posicion_actual : 0,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } else {
    // Guardar archivo de ejemplo inicial en /uploads
    fs.writeFileSync(path.join(UPLOADS_DIR, state.filename), DEFAULT_TEXT, 'utf-8');
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }
} catch (err) {
  console.warn('No se pudo cargar la configuración previa, usando valores por defecto:', err);
}

/**
 * Guarda el estado actual en el archivo de configuración local
 */
function persistState() {
  try {
    state.updatedAt = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error al persistir el estado de lectura en disco:', err);
  }
}

/**
 * Construye la respuesta con la estructura solicitada por el usuario:
 * { "char": "A", "position": 0, "braille": [true, false, false, false, false, false] }
 */
export function buildResponse(position: number): BrailleResponse {
  const text = state.currentText || '';
  const len = text.length;

  // Clampear posición dentro de límites
  let safePos = 0;
  if (len > 0) {
    safePos = Math.max(0, Math.min(position, len - 1));
  }
  state.posicion_actual = safePos;

  const char = len > 0 ? text.charAt(safePos) : '';
  const braille = charToBraille(char);
  const unicodeBraille = brailleToUnicode(braille);

  return {
    char: char,
    position: safePos,
    braille: braille,
    totalLength: len,
    posicion_inicial: state.posicion_inicial,
    unicodeBraille: unicodeBraille,
    hasNext: safePos < len - 1,
    hasPrev: safePos > 0,
  };
}

/**
 * Guarda un nuevo archivo .txt en /uploads y actualiza el texto y posiciones
 */
export function saveUploadedText(
  filename: string,
  content: string,
  posicionInicial: number
): BrailleResponse {
  // Asegurar directorio
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Sanitizar nombre de archivo y guardar en /uploads
  const safeFilename = path.basename(filename || 'documento.txt');
  const filePath = path.join(UPLOADS_DIR, safeFilename);
  fs.writeFileSync(filePath, content, 'utf-8');

  // Validar y fijar posiciones
  const textLength = content.length;
  const initial = Math.max(0, Math.min(Math.floor(posicionInicial || 0), Math.max(0, textLength - 1)));

  state.currentText = content;
  state.filename = safeFilename;
  state.posicion_inicial = initial;
  state.posicion_actual = initial; // Requisito: posicion_actual = posicion_inicial

  persistState();

  return buildResponse(state.posicion_actual);
}

/**
 * Endpoint GET /api/braille/inicio:
 * Reinicia posicion_actual al valor de posicion_inicial
 */
export function resetToInitial(): BrailleResponse {
  state.posicion_actual = state.posicion_inicial;
  persistState();
  return buildResponse(state.posicion_actual);
}

/**
 * Endpoint GET /api/braille/siguiente:
 * Incrementa posicion_actual en +1 (sin salir del rango del texto)
 */
export function nextChar(): BrailleResponse {
  const maxIndex = Math.max(0, state.currentText.length - 1);
  if (state.posicion_actual < maxIndex) {
    state.posicion_actual += 1;
    persistState();
  }
  return buildResponse(state.posicion_actual);
}

/**
 * Endpoint GET /api/braille/anterior:
 * Decrementa posicion_actual en -1 (mínimo 0)
 */
export function prevChar(): BrailleResponse {
  if (state.posicion_actual > 0) {
    state.posicion_actual -= 1;
    persistState();
  }
  return buildResponse(state.posicion_actual);
}

/**
 * Obtener estado completo actual (para la interfaz web)
 */
export function getFullState() {
  const currentResponse = buildResponse(state.posicion_actual);
  return {
    ...currentResponse,
    currentText: state.currentText,
    filename: state.filename,
    posicion_inicial: state.posicion_inicial,
    posicion_actual: state.posicion_actual,
    updatedAt: state.updatedAt,
  };
}
