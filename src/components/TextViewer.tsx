import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, FileText, CheckCircle2, Bookmark, Navigation, Sparkles, AlertCircle } from 'lucide-react';

interface TextViewerProps {
  currentText: string;
  filename: string;
  posicionInicial: number;
  posicionActual: number;
  onSetPosicionInicial: (index: number) => void;
  onSaveAndUpload: (file: File | null, textContent: string, initialPos: number) => Promise<void>;
  isLoading: boolean;
}

export const TextViewer: React.FC<TextViewerProps> = ({
  currentText,
  filename,
  posicionInicial,
  posicionActual,
  onSetPosicionInicial,
  onSaveAndUpload,
  isLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [displayText, setDisplayText] = useState<string>(currentText);
  const [displayFilename, setDisplayFilename] = useState<string>(filename);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sincronizar si cambia el texto desde el backend
  React.useEffect(() => {
    if (currentText !== displayText && !selectedFile) {
      setDisplayText(currentText);
      setDisplayFilename(filename);
    }
  }, [currentText, filename]);

  // Manejador de selección de archivo local
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      setStatusMessage({
        type: 'error',
        text: 'Por favor selecciona un archivo con extensión .txt válido.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setSelectedFile(file);
      setDisplayText(content);
      setDisplayFilename(file.name);
      onSetPosicionInicial(0); // Reiniciar a posición 0 por defecto al cargar nuevo archivo
      setStatusMessage({
        type: 'info',
        text: `Archivo "${file.name}" leído (${content.length} caracteres). Haz clic en un carácter para fijar la posición inicial y presiona "Guardar y Cargar Texto".`,
      });
    };
    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: 'Error al leer el contenido del archivo .txt seleccionado.',
      });
    };
    reader.readAsText(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Cargar texto de ejemplo para probar rápidamente
  const handleLoadSample = () => {
    const sample = 'HOLA MUNDO DESDE ESP32. ESTE ES UN PROTOTIPO DE LECTURA EN BRAILLE DE 6 PUNTOS. 12345!';
    const blob = new Blob([sample], { type: 'text/plain' });
    const file = new File([blob], 'ejemplo_braille.txt', { type: 'text/plain' });
    setSelectedFile(file);
    setDisplayText(sample);
    setDisplayFilename(file.name);
    onSetPosicionInicial(0);
    setStatusMessage({
      type: 'info',
      text: 'Texto de prueba cargado en el visor. Haz clic en "Guardar y Cargar Texto" para enviarlo al servidor.',
    });
  };

  // Enviar archivo y posición inicial al backend (POST /api/upload)
  const handleSubmit = async () => {
    try {
      await onSaveAndUpload(selectedFile, displayText, posicionInicial);
      setStatusMessage({
        type: 'success',
        text: `¡Texto guardado exitosamente en /uploads! Posición inicial fijada en [${posicionInicial}].`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Error al enviar el archivo al backend.',
      });
    }
  };

  const totalChars = displayText.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col space-y-4">
      {/* Encabezado del visor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Visor de Texto TXT</h2>
            <p className="text-xs text-slate-500">
              Archivo activo: <span className="font-mono font-medium text-slate-700">{displayFilename}</span> ({totalChars} caracteres)
            </p>
          </div>
        </div>

        {/* Botón de texto de ejemplo */}
        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cargar Ejemplo</span>
        </button>
      </div>

      {/* Zona de Carga / Drag and Drop */}
      <div
        id="txt-upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          onChange={handleFileChange}
          className="hidden"
          id="txt-file-input"
        />
        <div className="flex items-center justify-center space-x-3">
          <div className="p-2 rounded-full bg-white shadow-xs text-indigo-600">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-800">
              Haz clic para seleccionar o arrastra un archivo <span className="font-semibold text-indigo-600">.txt</span>
            </p>
            <p className="text-[11px] text-slate-400">
              Se guardará en la carpeta local <code className="text-slate-600 bg-slate-200/60 px-1 py-0.5 rounded">/uploads</code> del servidor
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor / Ventana de altura fija (max-height: 350px) con scroll vertical */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-700">Contenido interactivo (Haz clic en un carácter):</span>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-600"></span>
              <span>Posición Inicial ({posicionInicial})</span>
            </span>
            <span className="inline-flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-emerald-700"></span>
              <span>Lectura Actual ({posicionActual})</span>
            </span>
          </div>
        </div>

        {/* Ventana de caracteres con altura fija max-h-[350px] */}
        <div
          id="txt-characters-container"
          ref={scrollContainerRef}
          className="max-h-[350px] h-[300px] overflow-y-auto overflow-x-hidden p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-sm leading-relaxed border border-slate-800 shadow-inner select-none"
        >
          {totalChars === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
              <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
              <p>No hay texto cargado actualmente.</p>
              <p className="text-slate-400 mt-1">Sube un archivo .txt o haz clic en "Cargar Ejemplo" arriba.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 items-center content-start">
              {displayText.split('').map((char, index) => {
                const isInitial = index === posicionInicial;
                const isCurrent = index === posicionActual;

                // Representación de caracteres invisibles o de control
                let displayChar = char;
                let isWhitespace = false;
                if (char === ' ') {
                  displayChar = '␣';
                  isWhitespace = true;
                } else if (char === '\n') {
                  displayChar = '↵';
                  isWhitespace = true;
                } else if (char === '\t') {
                  displayChar = '⇥';
                  isWhitespace = true;
                }

                // Estilos según estado
                let highlightClass = 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700/60';
                
                if (isInitial && isCurrent) {
                  highlightClass = 'bg-gradient-to-br from-amber-500 to-emerald-500 text-white font-bold ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900 border-white';
                } else if (isCurrent) {
                  highlightClass = 'bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900 border-emerald-300 shadow-md shadow-emerald-500/20';
                } else if (isInitial) {
                  highlightClass = 'bg-amber-400 text-slate-950 font-bold ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900 border-amber-200';
                }

                return (
                  <button
                    key={`char-${index}`}
                    id={`char-tile-${index}`}
                    type="button"
                    onClick={() => onSetPosicionInicial(index)}
                    title={`Índice: ${index} | Carácter: "${char === '\n' ? '\\n' : char}" | Clic para fijar Posición Inicial`}
                    className={`relative min-w-[28px] h-8 px-1.5 rounded flex items-center justify-center text-xs font-mono border transition-all cursor-pointer ${highlightClass} ${
                      isWhitespace ? 'opacity-70 text-[10px]' : ''
                    }`}
                  >
                    <span>{displayChar}</span>
                    {/* Badge miniatura indicador si es inicial */}
                    {isInitial && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-slate-900" />
                    )}
                    {/* Badge miniatura indicador si es actual */}
                    {isCurrent && (
                      <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Barra de información de selección */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-slate-700">
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Posición inicial seleccionada:</span>
            <span className="font-mono font-bold text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded">
              [{posicionInicial}] '{totalChars > 0 ? (displayText[posicionInicial] === ' ' ? 'ESPACIO' : displayText[posicionInicial]) : ''}'
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-700">
            <Navigation className="w-3.5 h-3.5 text-emerald-500" />
            <span>Puntero de lectura actual:</span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
              [{posicionActual}] '{totalChars > 0 ? (displayText[posicionActual] === ' ' ? 'ESPACIO' : displayText[posicionActual]) : ''}'
            </span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Rango válido: 0 a {Math.max(0, totalChars - 1)}
        </span>
      </div>

      {/* Mensaje de estado */}
      {statusMessage && (
        <div
          id="txt-viewer-status-message"
          className={`flex items-center space-x-2 p-2.5 rounded-lg text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Botón "Guardar y Cargar Texto" */}
      <div className="pt-2">
        <button
          id="save-and-upload-btn"
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || totalChars === 0}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Guardando en /uploads y actualizando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-indigo-200" />
              <span>Guardar y Cargar Texto en Backend</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
