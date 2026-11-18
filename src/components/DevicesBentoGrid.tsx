import React, { useState } from 'react';
import { Check, Copy, Cpu, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Esp32Device } from '../types';
import { BrailleCellApple } from './BrailleCellApple';

interface DevicesBentoGridProps {
  devices: Esp32Device[];
  syncMode: boolean;
  onOpenAddDevice: () => void;
  onRotateToken: (deviceId: number) => Promise<void>;
  onToggleActive: (device: Esp32Device) => Promise<void>;
  onDeleteDevice: (deviceId: number) => Promise<void>;
}

export const DevicesBentoGrid: React.FC<DevicesBentoGridProps> = ({
  devices,
  syncMode,
  onOpenAddDevice,
  onRotateToken,
  onToggleActive,
  onDeleteDevice,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (device: Esp32Device) => {
    navigator.clipboard.writeText(device.device_token);
    setCopiedId(device.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-semibold text-white">
            Dispositivos ESP32 del Salón
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {syncMode
              ? 'Modo Sincronizado activo: todos los pupitres reciben la posición de la Computadora Global.'
              : 'Modo Libre activo: cada ESP32 navega de forma independiente con sus botones físicos.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddDevice}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Vincular ESP32</span>
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-2xl bg-[#121216] border border-white/[0.08] p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto text-zinc-400">
            <Cpu className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-white">
            No hay dispositivos ESP32 registrados en este salón
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Registra un pupitre para generar su token único X-ESP32-Token e
            ingrésalo en el portal cautivo 192.168.4.1 del hardware.
          </p>
          <button
            type="button"
            onClick={onOpenAddDevice}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primer ESP32</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="rounded-2xl bg-[#121216] border border-white/[0.08] p-5 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {device.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        device.is_online ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                    <span className={device.is_online ? 'text-emerald-400' : 'text-zinc-500'}>
                      {device.is_online ? 'En línea' : 'Sin señal'}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="font-mono tabular-nums text-zinc-400">
                      Pos {device.current_position}
                    </span>
                  </p>
                </div>

                <BrailleCellApple
                  size="sm"
                  dots={device.braille}
                  char={device.current_char}
                  unicodeBraille={device.unicode_braille}
                />
              </div>

              <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-500">Token</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <code className="font-mono text-[11px] text-zinc-300 truncate max-w-[160px]">
                      {device.device_token}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(device)}
                      title="Copiar X-ESP32-Token"
                      className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                    >
                      {copiedId === device.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono tabular-nums">
                  <span>IP: {device.last_ip || 'Pendiente'}</span>
                  <span>
                    {device.last_seen
                      ? new Date(device.last_seen).toLocaleTimeString()
                      : 'Sin lecturas'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleActive(device)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {device.is_active ? 'Deshabilitar' : 'Habilitar'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRotateToken(device.id)}
                    title="Regenerar token del dispositivo"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDevice(device.id)}
                    title="Desvincular dispositivo"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
