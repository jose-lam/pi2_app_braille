import React from 'react';
import { BrailleCell } from '../types';

interface BrailleCellAppleProps {
  dots: BrailleCell;
  char: string;
  unicodeBraille?: string;
  size?: 'lg' | 'sm';
}

const PIN_METADATA = [
  { dot: 1, gpio: 'GPIO 23', physical: true },
  { dot: 2, gpio: 'GPIO 33', physical: true },
  { dot: 3, gpio: 'GPIO 26', physical: true },
  { dot: 4, gpio: 'GPIO 32', physical: true },
  { dot: 5, gpio: 'GPIO 25', physical: true },
  { dot: 6, gpio: 'Ext. Virtual', physical: false },
];

export const BrailleCellApple: React.FC<BrailleCellAppleProps> = ({
  dots,
  char,
  unicodeBraille,
  size = 'lg',
}) => {
  const safeDots: BrailleCell =
    dots && dots.length === 6
      ? dots
      : [false, false, false, false, false, false];

  const col1 = [0, 1, 2];
  const col2 = [3, 4, 5];

  if (size === 'sm') {
    return (
      <div
        className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08]"
        aria-label={`Celda Braille para ${char || 'espacio'}`}
      >
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 3, 1, 4, 2, 5].map((idx) => {
            const active = safeDots[idx];
            const isVirtual = idx === 5;
            return (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                  active
                    ? isVirtual
                      ? 'bg-amber-400/70 ring-1 ring-amber-300/60'
                      : 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                    : isVirtual
                    ? 'border border-dashed border-white/20 bg-transparent'
                    : 'bg-white/[0.08] border border-white/[0.08]'
                }`}
              />
            );
          })}
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-display font-semibold text-white tabular-nums">
            {char === ' ' ? '␣' : char === '\n' ? '↵' : char || '—'}
          </span>
          {unicodeBraille && (
            <span className="text-xs text-zinc-400 mt-0.5">{unicodeBraille}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/[0.08] p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <p className="text-xs font-medium text-zinc-400">
            Celda Braille Táctil · 5 Solenoides + Extensión P6
          </p>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="text-4xl font-display font-semibold tracking-tight text-white">
              {char === ' '
                ? 'Espacio'
                : char === '\n'
                ? 'Salto'
                : char === ''
                ? '—'
                : `'${char}'`}
            </span>
            {unicodeBraille && (
              <span className="text-3xl text-amber-400 leading-none">
                {unicodeBraille}
              </span>
            )}
          </div>
        </div>
        <div className="text-right font-mono tabular-nums">
          <p className="text-xs text-zinc-400">ASCII</p>
          <p className="text-sm font-medium text-zinc-200 mt-0.5">
            {char ? char.charCodeAt(0) : '—'}
          </p>
        </div>
      </div>

      {/* Machined Apple Hardware Surface */}
      <div className="my-6 flex justify-center">
        <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl px-10 py-7 shadow-inner">
          <div className="grid grid-cols-2 gap-x-10 gap-y-5">
            {[0, 1, 2].map((row) => (
              <React.Fragment key={row}>
                {[col1[row], col2[row]].map((idx) => {
                  const meta = PIN_METADATA[idx];
                  const active = safeDots[idx];
                  return (
                    <div key={meta.dot} className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 ${
                          active
                            ? meta.physical
                              ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.45)] scale-105'
                              : 'bg-amber-400/20 border-2 border-dashed border-amber-400 text-amber-300'
                            : meta.physical
                            ? 'bg-[#18181D] border border-white/[0.08] text-zinc-500'
                            : 'bg-transparent border border-dashed border-white/[0.15] text-zinc-600'
                        }`}
                      >
                        <span className="font-mono text-xs font-semibold tabular-nums">
                          P{meta.dot}
                        </span>
                      </div>
                      <div className="min-w-[68px]">
                        <p
                          className={`text-xs font-medium ${
                            active ? 'text-zinc-100' : 'text-zinc-500'
                          }`}
                        >
                          {active ? 'Activo' : 'Reposo'}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500">
                          {meta.gpio}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <span className="text-zinc-400">Vector booleano de salida</span>
        <code className="font-mono text-zinc-200 tabular-nums">
          [{safeDots.map((d) => (d ? '1' : '0')).join(', ')}]
        </code>
      </div>
    </div>
  );
};
