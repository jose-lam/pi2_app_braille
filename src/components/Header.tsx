import React from 'react';
import { Cpu, Key, Radio, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  token: string;
  onOpenTokenConfig: () => void;
  isBackendConnected: boolean;
  totalLength: number;
  currentPos: number;
  initialPos: number;
}

export const Header: React.FC<HeaderProps> = ({
  token,
  onOpenTokenConfig,
  isBackendConnected,
  totalLength,
  currentPos,
  initialPos,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo y Título Principal */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10 border border-slate-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Lector Braille Prototipo ESP32
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                  v1.0 Hardware Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sistema de traducción de texto a celda Braille de 6 puntos con simulación IoT
              </p>
            </div>
          </div>

          {/* Estado de conexión, posición y Token */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Indicador de conexión */}
            <div
              id="backend-connection-badge"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  isBackendConnected ? 'text-emerald-500 animate-pulse' : 'text-rose-500'
                }`}
              />
              <span>{isBackendConnected ? 'Backend Activo' : 'Desconectado'}</span>
            </div>

            {/* Punteros de lectura */}
            <div
              id="header-pointers-badge"
              className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-mono border border-slate-200"
            >
              <span>
                Pos: <strong className="text-slate-900 font-bold">{totalLength > 0 ? currentPos : 0}</strong>
                <span className="text-slate-400">/{Math.max(0, totalLength - 1)}</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-700 font-semibold">
                Inicio: [{initialPos}]
              </span>
            </div>

            {/* Botón Token de Seguridad */}
            <button
              id="token-config-btn"
              onClick={onOpenTokenConfig}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
              title="Configurar Header X-ESP32-Token para pruebas"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono truncate max-w-[120px]">{token || 'Sin Token'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
