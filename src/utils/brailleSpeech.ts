const PHONETIC_MAP_ES: Record<string, string> = {
  // Vocales sin tilde
  a: 'a',
  e: 'e',
  i: 'i',
  o: 'o',
  u: 'u',
  // Vocales con tilde y diéresis
  á: 'a con tilde',
  é: 'e con tilde',
  í: 'i con tilde',
  ó: 'o con tilde',
  ú: 'u con tilde',
  ü: 'u con diéresis',
  // Consonantes
  b: 'be',
  c: 'ce',
  d: 'de',
  f: 'efe',
  g: 'ge',
  h: 'ache',
  j: 'jota',
  k: 'ka',
  l: 'ele',
  m: 'eme',
  n: 'ene',
  ñ: 'eñe',
  p: 'pe',
  q: 'cu',
  r: 'erre',
  s: 'ese',
  t: 'te',
  v: 'uve',
  w: 'doble uve',
  x: 'equis',
  y: 'i griega',
  z: 'zeta',
  // Números
  '0': 'cero',
  '1': 'uno',
  '2': 'dos',
  '3': 'tres',
  '4': 'cuatro',
  '5': 'cinco',
  '6': 'seis',
  '7': 'siete',
  '8': 'ocho',
  '9': 'nueve',
  // Signos y espacios
  ' ': 'espacio',
  '.': 'punto',
  ',': 'coma',
  ';': 'punto y coma',
  ':': 'dos puntos',
  '?': 'signo de interrogación',
  '¿': 'signo de apertura de interrogación',
  '!': 'signo de exclamación',
  '¡': 'signo de apertura de exclamación',
  '-': 'guion',
  _: 'guion bajo',
  '"': 'comillas',
  "'": 'apóstrofo',
  '(': 'abrir paréntesis',
  ')': 'cerrar paréntesis',
  '/': 'barra',
  '@': 'arroba',
  '+': 'más',
  '=': 'igual',
  '\n': 'salto de línea',
  '\r': 'retorno de carro',
  '\t': 'tabulación',
};

export function getSpanishPhoneticName(char: string): string {
  if (!char) return '';
  const lower = char.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(PHONETIC_MAP_ES, lower)) {
    return PHONETIC_MAP_ES[lower];
  }
  return char;
}

function selectSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  return (
    voices.find((v) => v.lang.toLowerCase() === 'es-es') ||
    voices.find((v) => v.lang.toLowerCase() === 'es-419') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('es-')) ||
    voices.find((v) => v.lang.toLowerCase() === 'es') ||
    null
  );
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  window.speechSynthesis.cancel();
}

export function speakBrailleChar(char: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  const textToSpeak = getSpanishPhoneticName(char);
  if (!textToSpeak) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = 'es-ES';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voice = selectSpanishVoice();
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}
