import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TextViewer } from './components/TextViewer';
import { Esp32Simulator } from './components/Esp32Simulator';
import { Esp32CodeGuide } from './components/Esp32CodeGuide';
import { TokenConfigModal } from './components/TokenConfigModal';
import { BrailleResponse, FullSystemState, ApiConfig } from './types';

const DEFAULT_TOKEN = 'MI_TOKEN_SECRETO_123';

export default function App() {
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('esp32_token') || DEFAULT_TOKEN;
  });
  const [isTokenModalOpen, setIsTokenModalOpen] = useState<boolean>(false);
  const [serverConfig, setServerConfig] = useState<ApiConfig | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  // Estado del texto y lectura
  const [currentText, setCurrentText] = useState<string>('HOLA MUNDO ESP32 BRAILLE 123');
  const [filename, setFilename] = useState<string>('ejemplo_inicial.txt');
  const [posicionInicial, setPosicionInicial] = useState<number>(0);

  // Estado Braille activo
  const [brailleState, setBrailleState] = useState<BrailleResponse>({
    char: 'H',
    position: 0,
    braille: [true, true, false, false, true, false],
    totalLength: 28,
    posicion_inicial: 0,
    unicodeBraille: '⠓',
    hasNext: true,
    hasPrev: false,
  });

  const [isLoadingUpload, setIsLoadingUpload] = useState<boolean>(false);
  const [isCallingApi, setIsCallingApi] = useState<boolean>(false);
  const [lastHttpLatencyMs, setLastHttpLatencyMs] = useState<number>(12);
  const [lastEndpointCalled, setLastEndpointCalled] = useState<string>('/api/braille/inicio');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guardar token en localStorage cuando cambie
  const handleSaveToken = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('esp32_token', newToken);
    setErrorMessage(null);
  };

  // Cargar configuración del servidor
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setServerConfig(data);
        setIsBackendConnected(true);
      }
    } catch {
      setIsBackendConnected(false);
    }
  }, []);

  // Cargar estado inicial desde el backend
  const fetchInitialState = useCallback(async () => {
    try {
      const startTime = performance.now();
      const res = await fetch('/api/braille/estado', {
        headers: {
          'X-ESP32-Token': token,
        },
      });

      const latency = Math.round(performance.now() - startTime);
      setLastHttpLatencyMs(latency);

      if (res.ok) {
        const data: FullSystemState = await res.json();
        setCurrentText(data.currentText || '');
        setFilename(data.filename || 'archivo.txt');
        setPosicionInicial(data.posicion_inicial ?? 0);
        setBrailleState(data);
        setIsBackendConnected(true);
        setErrorMessage(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.message || `Error HTTP ${res.status}: No autorizado`);
      }
    } catch {
      setIsBackendConnected(false);
      setErrorMessage('No se pudo conectar con el servidor Express.');
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
    fetchInitialState();
  }, [fetchConfig, fetchInitialState]);

  // Endpoint: GET /api/braille/inicio
  const handleGoToStart = async () => {
    setIsCallingApi(true);
    setLastEndpointCalled('/api/braille/inicio');
    const startTime = performance.now();
    try {
      const res = await fetch('/api/braille/inicio', {
        method: 'GET',
        headers: {
          'X-ESP32-Token': token,
        },
      });
      const latency = Math.round(performance.now() - startTime);
      setLastHttpLatencyMs(latency);

      if (res.ok) {
        const data: BrailleResponse = await res.json();
        setBrailleState(data);
        setErrorMessage(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(
          errData.message || `HTTP ${res.status}: Error al ejecutar /api/braille/inicio`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsCallingApi(false);
    }
  };

  // Endpoint: GET /api/braille/siguiente
  const handleNextLetter = async () => {
    setIsCallingApi(true);
    setLastEndpointCalled('/api/braille/siguiente');
    const startTime = performance.now();
    try {
      const res = await fetch('/api/braille/siguiente', {
        method: 'GET',
        headers: {
          'X-ESP32-Token': token,
        },
      });
      const latency = Math.round(performance.now() - startTime);
      setLastHttpLatencyMs(latency);

      if (res.ok) {
        const data: BrailleResponse = await res.json();
        setBrailleState(data);
        setErrorMessage(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(
          errData.message || `HTTP ${res.status}: Error al ejecutar /api/braille/siguiente`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsCallingApi(false);
    }
  };

  // Endpoint: GET /api/braille/anterior
  const handlePrevLetter = async () => {
    setIsCallingApi(true);
    setLastEndpointCalled('/api/braille/anterior');
    const startTime = performance.now();
    try {
      const res = await fetch('/api/braille/anterior', {
        method: 'GET',
        headers: {
          'X-ESP32-Token': token,
        },
      });
      const latency = Math.round(performance.now() - startTime);
      setLastHttpLatencyMs(latency);

      if (res.ok) {
        const data: BrailleResponse = await res.json();
        setBrailleState(data);
        setErrorMessage(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(
          errData.message || `HTTP ${res.status}: Error al ejecutar /api/braille/anterior`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsCallingApi(false);
    }
  };

  // Endpoint: POST /api/upload
  const handleSaveAndUpload = async (
    file: File | null,
    textContent: string,
    initialPos: number
  ) => {
    setIsLoadingUpload(true);
    setLastEndpointCalled('/api/upload');
    const startTime = performance.now();

    try {
      let res: Response;

      if (file) {
        // Enviar con FormData y Multer
        const formData = new FormData();
        formData.append('file', file);
        formData.append('posicion_inicial', String(initialPos));

        res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'X-ESP32-Token': token,
          },
          body: formData,
        });
      } else {
        // Enviar vía JSON
        res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ESP32-Token': token,
          },
          body: JSON.stringify({
            text: textContent,
            filename: filename || 'documento.txt',
            posicion_inicial: initialPos,
          }),
        });
      }

      const latency = Math.round(performance.now() - startTime);
      setLastHttpLatencyMs(latency);

      if (res.ok) {
        const data = await res.json();
        setCurrentText(textContent);
        if (data.filename) setFilename(data.filename);
        setPosicionInicial(initialPos);
        setBrailleState({
          char: data.char,
          position: data.position,
          braille: data.braille,
          totalLength: data.totalLength,
          posicion_inicial: data.posicion_inicial,
          unicodeBraille: data.unicodeBraille,
          hasNext: data.hasNext,
          hasPrev: data.hasPrev,
        });
        setErrorMessage(null);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error del servidor HTTP ${res.status}`);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al subir archivo');
      throw error;
    } finally {
      setIsLoadingUpload(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Encabezado Principal */}
      <Header
        token={token}
        onOpenTokenConfig={() => setIsTokenModalOpen(true)}
        isBackendConnected={isBackendConnected}
        totalLength={brailleState.totalLength ?? currentText.length}
        currentPos={brailleState.position ?? 0}
        initialPos={posicionInicial}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Grilla Superior: Visor de Texto (Izquierda) + Simulador ESP32 (Derecha) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Panel Izquierdo: Carga y Visor del TXT */}
          <div className="lg:col-span-6 w-full">
            <TextViewer
              currentText={currentText}
              filename={filename}
              posicionInicial={posicionInicial}
              posicionActual={brailleState.position ?? 0}
              onSetPosicionInicial={setPosicionInicial}
              onSaveAndUpload={handleSaveAndUpload}
              isLoading={isLoadingUpload}
            />
          </div>

          {/* Panel Derecho: Simulador Físico de ESP32 con Matriz Braille */}
          <div className="lg:col-span-6 w-full">
            <Esp32Simulator
              brailleState={brailleState}
              onGoToStart={handleGoToStart}
              onNextLetter={handleNextLetter}
              onPrevLetter={handlePrevLetter}
              isCallingApi={isCallingApi}
              lastHttpLatencyMs={lastHttpLatencyMs}
              lastEndpointCalled={lastEndpointCalled}
              errorMessage={errorMessage}
            />
          </div>
        </div>

        {/* Sección Inferior: Código Firmware ESP32, Comandos cURL y Guía */}
        <div className="w-full">
          <Esp32CodeGuide token={token} />
        </div>
      </main>

      {/* Footer sobrio y técnico */}
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-center text-xs text-slate-500 font-mono">
        <p>
          Lector Braille IoT Prototipo • Node.js Express REST API + Vite React • Header X-ESP32-Token: "{token}"
        </p>
      </footer>

      {/* Modal de Configuración de Token de Seguridad */}
      <TokenConfigModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        currentToken={token}
        onSaveToken={handleSaveToken}
        serverConfig={serverConfig}
      />
    </div>
  );
}
