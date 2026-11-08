import React, { useEffect } from 'react';
import { RotateCcw, ArrowRight, ArrowLeft, Zap, Wifi, Activity, Terminal } from 'lucide-react';
import { BrailleCell, BrailleResponse } from '../types';

interface Esp32SimulatorProps {
  brailleState: BrailleResponse;
  onGoToStart: () => Promise<void>;
  onNextLetter: () => Promise<void>;
  onPrevLetter: () => Promise<void>;
  isCallingApi: boolean;
  lastHttpLatencyMs?: number;
  lastEndpointCalled?: string;
  errorMessage?: string | null;
}

export const Esp32Simulator: React.FC<Esp32SimulatorProps> = ({
  brailleState,
  onGoToStart,
  onNextLetter,
  onPrevLetter,
  isCallingApi,
  lastHttpLatencyMs = 0,
  lastEndpointCalled = '/api/braille/inicio',
  errorMessage,
}) => {
  // Atajos de teclado para una experiencia fluida (Flecha Izq, Flecha Der, Barra Espaciadora / Inicio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evitar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onNextLetter();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onPrevLetter();
      } else if (e.key === 'Home' || e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onGoToStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextLetter, onPrevLetter, onGoToStart]);

  const braille: BrailleCell = brailleState.braille || [false, false, false, false, false, false];
  const char = brailleState.char ?? '';
  const position = brailleState.position ?? 0;
  const totalLength = brailleState.totalLength ?? 0;
  const unicodeGlyph = brailleState.unicodeBraille || '⠀';

  // Mapeo físico de pines GPIO estándar ESP32 a la celda Braille
  const ledMapping = [
    { dot: 1, state: braille[0], pin: 'GPIO 13', col: 1, row: 1 },
    { dot: 2, state: braille[1], pin: 'GPIO 12', col: 1, row: 2 },
    { dot: 3, state: braille[2], pin: 'GPIO 14', col: 1, row: 3 },
    { dot: 4, state: braille[3], pin: 'GPIO 27', col: 2, row: 1 },
    { dot: 5, state: braille[4], pin: 'GPIO 26', col: 2, row: 2 },
    { dot: 6, state: braille[5], pin: 'GPIO 25', col: 2, row: 3 },
  ];

  // Separar en 2 columnas para el renderizado fiel de la celda de 2 columnas x 3 filas
  const col1 = ledMapping.filter((l) => l.col === 1);
  const col2 = ledMapping.filter((l) => l.col === 2);

  return (
    <div className="bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Header del Simulador con estilo Hardware */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600/80 inline-block border border-rose-500/50 shadow-xs shadow-rose-500/40" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-400/50" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-400/50" />
          </div>
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
              ESP32-WROOM-32 Virtual
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
              DevKit v1
            </span>
          </div>
        </div>

        {/* Indicadores de hardware en tiempo real */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1 text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">802.11 b/g/n</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400">
            <Activity className={`w-3.5 h-3.5 ${isCallingApi ? 'text-amber-400 animate-spin' : 'text-blue-400'}`} />
            <span className="text-[11px]">{isCallingApi ? 'TX/RX...' : `${lastHttpLatencyMs}ms`}</span>
          </div>
        </div>
      </div>

      {/* Placa PCB Virtual con textura y componentes */}
      <div className="p-6 relative bg-[#0d1117] flex-1 flex flex-col space-y-6">
        {/* Pistas de circuito decorativas sutiles */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Zona Superior: Módulo ESP-WROOM-32 y Pantalla OLED */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
          
          {/* Módulo Metálico ESP32 */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-xl p-4 border border-slate-600/80 shadow-md flex flex-col justify-between relative overflow-hidden">
            {/* Antena PCB grabada */}
            <div className="h-4 bg-slate-950/70 rounded-md border border-slate-700/60 mb-3 flex items-center justify-between px-2">
              <span className="text-[9px] text-amber-500/80 font-mono tracking-widest font-semibold">
                PCB ANTENNA 2.4GHz
              </span>
              <div className="flex space-x-0.5">
                <span className="w-1 h-2 bg-amber-500/40 rounded-xs" />
                <span className="w-1 h-2 bg-amber-500/60 rounded-xs" />
                <span className="w-1 h-2 bg-amber-500/80 rounded-xs" />
              </div>
            </div>

            {/* Grabado láser del chip */}
            <div className="text-center py-2">
              <div className="text-slate-300 font-bold font-mono text-sm tracking-wider">
                ESP-WROOM-32
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Dual-Core Tensilica LX6 @ 240MHz
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-1">
                FCC ID: 2AC7Z-ESPWROOM32 • 520KB SRAM
              </div>
            </div>

            {/* LEDs SMD de placa (PWR y DATA) */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-[10px] font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" />
                <span className="text-slate-400">PWR (3.3V)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isCallingApi
                      ? 'bg-blue-400 shadow-md shadow-blue-400 scale-125'
                      : 'bg-slate-700'
                  }`}
                />
                <span className="text-slate-400">IO2 (DATA)</span>
              </div>
            </div>
          </div>

          {/* Pantalla OLED Virtual de 0.96 pulgadas (Visualizador I2C SSD1306) */}
          <div className="lg:col-span-7 bg-black rounded-xl p-4 border-2 border-slate-700/80 shadow-inner flex flex-col justify-between font-mono">
            {/* Barra superior de la pantalla OLED */}
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/60 text-[11px] text-cyan-400/90">
              <span className="flex items-center space-x-1">
                <Terminal className="w-3 h-3" />
                <span>SSD1306 OLED (I2C)</span>
              </span>
              <span className="text-[10px] text-cyan-500 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60">
                {lastEndpointCalled}
              </span>
            </div>

            {/* Visualización central del Carácter y Braille Unicode */}
            <div className="py-3 flex items-center justify-around">
              {/* Carácter Alfanumérico */}
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider text-cyan-600 block">
                  Carácter Actual
                </span>
                <div
                  id="esp32-current-char"
                  className="text-4xl font-extrabold text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] my-1 min-w-[50px]"
                >
                  {char === '' ? (
                    <span className="text-cyan-700 text-lg">N/A</span>
                  ) : char === ' ' ? (
                    <span className="text-amber-400 text-base font-sans font-bold">[ESPACIO]</span>
                  ) : char === '\n' ? (
                    <span className="text-amber-400 text-base font-sans font-bold">[\n ENTER]</span>
                  ) : (
                    `'${char}'`
                  )}
                </div>
                <span className="text-[10px] text-cyan-500 font-mono">
                  ASCII: {char ? char.charCodeAt(0) : '-'}
                </span>
              </div>

              {/* Glifo Braille Unicode */}
              <div className="text-center border-l border-r border-cyan-900/50 px-4">
                <span className="text-[10px] uppercase tracking-wider text-cyan-600 block">
                  Glifo Braille
                </span>
                <div
                  id="esp32-unicode-braille"
                  className="text-4xl font-bold text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] my-1"
                >
                  {unicodeGlyph}
                </div>
                <span className="text-[10px] text-amber-500/80 font-mono">
                  U+{unicodeGlyph.charCodeAt(0).toString(16).toUpperCase()}
                </span>
              </div>

              {/* Posición de Lectura */}
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider text-cyan-600 block">
                  Puntero
                </span>
                <div
                  id="esp32-current-position"
                  className="text-2xl font-bold text-cyan-300 my-1 font-mono"
                >
                  {totalLength > 0 ? position : 0}
                  <span className="text-xs text-cyan-700 font-normal">/{Math.max(0, totalLength - 1)}</span>
                </div>
                <span className="text-[10px] text-cyan-500 block">
                  Inicial: [{brailleState.posicion_inicial ?? 0}]
                </span>
              </div>
            </div>

            {/* Arreglo Booleano en vivo [p1, p2, p3, p4, p5, p6] */}
            <div className="pt-2 border-t border-cyan-900/60 flex items-center justify-between text-[11px]">
              <span className="text-cyan-500 text-[10px]">Arreglo Braille:</span>
              <div
                id="esp32-boolean-array"
                className="text-amber-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 text-[10px] font-mono"
              >
                [{braille.map((b) => (b ? 'true' : 'false')).join(', ')}]
              </div>
            </div>
          </div>
        </div>

        {/* Zona Central: MATRIZ DE 6 LEDs VIRTUALES (Celda Braille Estándar) */}
        <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 shadow-inner flex flex-col items-center">
          <div className="flex items-center justify-between w-full pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                Matriz de 6 LEDs Braille (2 Columnas × 3 Filas)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Salidas Digitales GPIO 3.3V
            </span>
          </div>

          {/* Celda Braille Física con los 6 LEDs */}
          <div
            id="braille-led-matrix"
            className="bg-slate-950 p-6 rounded-2xl border-2 border-slate-800 shadow-2xl flex space-x-12 relative"
          >
            {/* Columna 1: Puntos 1, 2, 3 */}
            <div className="flex flex-col space-y-6 items-center">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                Columna 1
              </div>
              {col1.map((item) => (
                <div key={`dot-${item.dot}`} className="flex flex-col items-center space-y-1.5">
                  {/* Diodo LED Virtual */}
                  <div
                    id={`braille-led-${item.dot}`}
                    className={`w-12 h-12 rounded-full border-2 transition-all duration-200 flex items-center justify-center relative cursor-default select-none ${
                      item.state
                        ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.9),inset_0_0_10px_rgba(255,255,255,0.8)] scale-105'
                        : 'bg-slate-900 border-slate-700/80 shadow-inner opacity-75'
                    }`}
                  >
                    {/* Brillo especular del domo LED */}
                    <div
                      className={`w-3.5 h-2 rounded-full absolute top-1.5 left-2.5 transition-opacity ${
                        item.state ? 'bg-white/80' : 'bg-slate-600/40'
                      }`}
                    />
                    {/* Número del punto Braille */}
                    <span
                      className={`font-mono text-xs font-bold transition-colors ${
                        item.state ? 'text-amber-950 drop-shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      P{item.dot}
                    </span>
                  </div>

                  {/* Etiqueta de Pin GPIO y Estado */}
                  <div className="text-center">
                    <span
                      className={`text-[10px] font-mono block font-semibold ${
                        item.state ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {item.state ? 'HIGH (1)' : 'LOW (0)'}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">{item.pin}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Línea divisoria central con grabado de referencia */}
            <div className="w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent self-stretch flex items-center justify-center">
              <span className="bg-slate-900 text-slate-600 text-[9px] font-mono py-1 px-0.5 transform -rotate-90 whitespace-nowrap">
                CELDA BRAILLE
              </span>
            </div>

            {/* Columna 2: Puntos 4, 5, 6 */}
            <div className="flex flex-col space-y-6 items-center">
              <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                Columna 2
              </div>
              {col2.map((item) => (
                <div key={`dot-${item.dot}`} className="flex flex-col items-center space-y-1.5">
                  {/* Diodo LED Virtual */}
                  <div
                    id={`braille-led-${item.dot}`}
                    className={`w-12 h-12 rounded-full border-2 transition-all duration-200 flex items-center justify-center relative cursor-default select-none ${
                      item.state
                        ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.9),inset_0_0_10px_rgba(255,255,255,0.8)] scale-105'
                        : 'bg-slate-900 border-slate-700/80 shadow-inner opacity-75'
                    }`}
                  >
                    {/* Brillo especular del domo LED */}
                    <div
                      className={`w-3.5 h-2 rounded-full absolute top-1.5 left-2.5 transition-opacity ${
                        item.state ? 'bg-white/80' : 'bg-slate-600/40'
                      }`}
                    />
                    {/* Número del punto Braille */}
                    <span
                      className={`font-mono text-xs font-bold transition-colors ${
                        item.state ? 'text-amber-950 drop-shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      P{item.dot}
                    </span>
                  </div>

                  {/* Etiqueta de Pin GPIO y Estado */}
                  <div className="text-center">
                    <span
                      className={`text-[10px] font-mono block font-semibold ${
                        item.state ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {item.state ? 'HIGH (1)' : 'LOW (0)'}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">{item.pin}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zona Inferior: 3 BOTONES INTERACTIVOS DEL ESP32 */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span className="font-semibold text-slate-300">Pulsadores Físicos de Control:</span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Atajos: [← Anterior] [Espacio: Inicio] [→ Siguiente]
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Botón 1: "Anterior Letra" (GET /api/braille/anterior) */}
            <button
              id="btn-esp32-anterior"
              type="button"
              onClick={onPrevLetter}
              disabled={isCallingApi || position <= 0}
              className="group relative flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-900 border-2 border-slate-700 hover:border-slate-500 active:border-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-bold text-sm">Anterior Letra</span>
              </div>
              <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                <span>GET /api/braille/anterior</span>
              </div>
              <span className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">
                [← / A]
              </span>
            </button>

            {/* Botón 2: "Ir al Inicio" (GET /api/braille/inicio) */}
            <button
              id="btn-esp32-inicio"
              type="button"
              onClick={onGoToStart}
              disabled={isCallingApi}
              className="group relative flex flex-col items-center justify-center p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/5 border-2 border-amber-500/60 hover:border-amber-400 text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-500/10 active:translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-amber-400 group-hover:-rotate-45 transition-transform" />
                <span className="font-bold text-sm">Ir al Inicio</span>
              </div>
              <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-amber-400/70 font-mono">
                <span>GET /api/braille/inicio</span>
              </div>
              <span className="absolute top-1 right-2 text-[9px] font-mono text-amber-500/60">
                [Espacio]
              </span>
            </button>

            {/* Botón 3: "Siguiente Letra" (GET /api/braille/siguiente) */}
            <button
              id="btn-esp32-siguiente"
              type="button"
              onClick={onNextLetter}
              disabled={isCallingApi || (totalLength > 0 && position >= totalLength - 1)}
              className="group relative flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-900 border-2 border-slate-700 hover:border-slate-500 active:border-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm">Siguiente Letra</span>
                <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                <span>GET /api/braille/siguiente</span>
              </div>
              <span className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">
                [→ / D]
              </span>
            </button>
          </div>
        </div>

        {/* Mensaje de error si falla la autenticación o conexión */}
        {errorMessage && (
          <div
            id="esp32-error-banner"
            className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono flex items-start space-x-2"
          >
            <span className="text-rose-400 font-bold">[ESP32 ERROR]:</span>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
