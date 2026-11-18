import React from 'react';
import {
  Monitor,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { RoomDetail } from '../types';

interface NowBroadcastingBarProps {
  room: RoomDetail;
  isThisComputerLinked: boolean;
  isBusy: boolean;
  isDictating: boolean;
  isMuted: boolean;
  onControl: (action: 'inicio' | 'siguiente' | 'anterior') => Promise<void>;
  onToggleSyncMode: (nextSync: boolean) => Promise<void>;
  onToggleDictation: () => void;
  onToggleMute: () => void;
}

export const NowBroadcastingBar: React.FC<NowBroadcastingBarProps> = ({
  room,
  isThisComputerLinked,
  isBusy,
  isDictating,
  isMuted,
  onControl,
  onToggleSyncMode,
  onToggleDictation,
  onToggleMute,
}) => {
  const { braille_state, current_text, filename, sync_mode } = room;
  const pos = braille_state.position;
  const total = braille_state.totalLength;
  const hasText = current_text.length > 0;

  // Ventana de contexto del texto alrededor del carácter actual
  const start = Math.max(0, pos - 14);
  const end = Math.min(current_text.length, pos + 18);
  const before = current_text.slice(start, pos);
  const activeChar = current_text.charAt(pos) || ' ';
  const after = current_text.slice(pos + 1, end);

  return (
    <div className="sticky bottom-0 z-30 bg-[#121216]/90 backdrop-blur-xl border-t border-white/[0.08] px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Izquierda: Estado de emisión y documento */}
        <div className="flex items-center gap-3.5 min-w-0 w-full lg:w-auto">
          <div className="w-11 h-11 rounded-xl bg-[#0A0A0C] border border-white/[0.08] flex items-center justify-center shrink-0">
            <span className="text-xl text-amber-400 leading-none">
              {braille_state.unicodeBraille}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-white truncate">
              <span className="truncate">{filename}</span>
              <span className="text-zinc-600">·</span>
              <span className="font-mono text-emerald-400 tabular-nums shrink-0">
                {activeChar === ' ' ? '[ESP]' : `'${activeChar}'`}
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 truncate mt-0.5">
              <Monitor className="w-3 h-3 shrink-0" />
              <span>
                {isThisComputerLinked
                  ? 'Computadora Global vinculada'
                  : room.global_online
                  ? `Emitiendo desde: ${room.global_computer_label || 'Otra PC'}`
                  : 'Sin Computadora Global activa'}
              </span>
            </p>
          </div>
        </div>

        {/* Centro: Controles tipo Spotify + cinta de caracteres en vivo */}
        <div className="flex flex-col items-center gap-1.5 w-full lg:max-w-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onControl('inicio')}
              title="Ir al inicio"
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isBusy || !braille_state.hasPrev}
              onClick={() => onControl('anterior')}
              title="Carácter anterior"
              className="p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isBusy || !braille_state.hasNext}
              onClick={() => onControl('siguiente')}
              title="Siguiente carácter"
              className="p-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 disabled:opacity-30 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 max-w-full overflow-hidden whitespace-nowrap">
            <span className="truncate">{before}</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              {activeChar === ' ' ? '␣' : activeChar === '\n' ? '↵' : activeChar}
            </span>
            <span className="truncate">{after}</span>
          </div>
        </div>

        {/* Derecha: Dictado + Audio + Modo Libre/Sincronizado + Posición */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 shrink-0">
          {sync_mode && hasText && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleDictation}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDictating
                    ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
                    : 'bg-white/[0.08] text-white hover:bg-white/[0.14] border border-white/[0.08]'
                }`}
              >
                {isDictating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Detener dictado</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Dictado</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Activar audio' : 'Silenciar audio'}
                title={isMuted ? 'Activar audio de pronunciación' : 'Silenciar audio'}
                className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                    : 'bg-[#0A0A0C] border-white/[0.08] text-zinc-200 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            </div>
          )}

          <div className="flex items-center p-1 rounded-xl bg-[#0A0A0C] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => onToggleSyncMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !sync_mode
                  ? 'bg-[#1D1D24] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Libre
            </button>
            <button
              type="button"
              onClick={() => onToggleSyncMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sync_mode
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sincronizado
            </button>
          </div>

          <span className="text-xs font-mono tabular-nums text-zinc-400 min-w-[54px] text-right">
            {total > 0 ? `${pos}/${total - 1}` : '0/0'}
          </span>
        </div>
      </div>
    </div>
  );
};
