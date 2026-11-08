import React, { useState } from 'react';
import { Key, ShieldAlert, Check, X, RefreshCw, Lock } from 'lucide-react';
import { ApiConfig } from '../types';

interface TokenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentToken: string;
  onSaveToken: (newToken: string) => void;
  serverConfig: ApiConfig | null;
}

export const TokenConfigModal: React.FC<TokenConfigModalProps> = ({
  isOpen,
  onClose,
  currentToken,
  onSaveToken,
  serverConfig,
}) => {
  const [tokenInput, setTokenInput] = useState<string>(currentToken);

  if (!isOpen) return null;

  const defaultExpected = serverConfig?.defaultToken || 'MI_TOKEN_SECRETO_123';

  const handleSave = () => {
    onSaveToken(tokenInput.trim());
    onClose();
  };

  const handleResetToDefault = () => {
    setTokenInput(defaultExpected);
  };

  const handleSetInvalid = () => {
    setTokenInput('TOKEN_INVALIDO_TEST_401');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100 relative">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Seguridad: Encabezado X-ESP32-Token
            </h3>
            <p className="text-xs text-slate-400">
              Middleware de autenticación de peticiones al backend
            </p>
          </div>
        </div>

        {/* Explicación */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          El backend de Express valida que todas las peticiones a la API incluyan la cabecera HTTP{' '}
          <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono text-[11px]">
            X-ESP32-Token
          </code>
          . Puedes modificarla aquí para probar tanto peticiones exitosas como respuestas de error 401 Unauthorized.
        </p>

        {/* Input del Token */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Valor de X-ESP32-Token en la sesión:</span>
            <span className="text-[10px] text-amber-400 font-mono">
              Esperado: {defaultExpected}
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 pr-10"
              placeholder="Ingresa el token secreto..."
            />
            <Key className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Botones rápidos de prueba */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex-1 text-[11px] py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center space-x-1"
          >
            <RefreshCw className="w-3 h-3 text-emerald-400" />
            <span>Restaurar Válido</span>
          </button>
          <button
            type="button"
            onClick={handleSetInvalid}
            className="flex-1 text-[11px] py-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 transition-colors flex items-center justify-center space-x-1"
          >
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>Simular Token Inválido</span>
          </button>
        </div>

        {/* Info adicional del servidor */}
        {serverConfig && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-5 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Restricción de IP:</span>
              <span className="text-slate-300">{serverConfig.allowedIp}</span>
            </div>
            <div className="flex justify-between">
              <span>Hora del Servidor:</span>
              <span className="text-slate-500">
                {new Date(serverConfig.serverTime).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar Token</span>
          </button>
        </div>
      </div>
    </div>
  );
};
