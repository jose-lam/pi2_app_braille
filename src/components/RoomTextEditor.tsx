import React, { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { Send, Upload } from 'lucide-react';

interface RoomTextEditorProps {
  currentText: string;
  filename: string;
  initialPosition: number;
  globalPosition: number;
  isSaving: boolean;
  onBroadcastText: (text: string, filename: string, initialPos: number) => Promise<void>;
  onUploadFile: (file: File, initialPos: number) => Promise<void>;
  onSelectPosition: (pos: number) => Promise<void>;
}

export const RoomTextEditor: React.FC<RoomTextEditorProps> = ({
  currentText,
  filename,
  initialPosition,
  globalPosition,
  isSaving,
  onBroadcastText,
  onUploadFile,
  onSelectPosition,
}) => {
  const [draftText, setDraftText] = useState(currentText);
  const [draftFilename, setDraftFilename] = useState(filename);
  const [draftInitPos, setDraftInitPos] = useState(initialPosition);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingFile && !isEditingRaw) {
      setDraftText(currentText);
      setDraftFilename(filename);
      setDraftInitPos(initialPosition);
    }
  }, [currentText, filename, initialPosition, pendingFile, isEditingRaw]);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      setFeedback('Selecciona un archivo de texto plano (.txt).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) || '';
      setPendingFile(file);
      setDraftText(content);
      setDraftFilename(file.name);
      setDraftInitPos(0);
      setIsEditingRaw(false);
      setFeedback(
        `Archivo "${file.name}" listo (${content.length} caracteres). Haz clic en "Transmitir al Salón".`
      );
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handlePublish = async () => {
    setFeedback(null);
    if (pendingFile) {
      await onUploadFile(pendingFile, draftInitPos);
      setPendingFile(null);
      setFeedback('Archivo .txt cargado y sincronizado en el salón.');
    } else {
      await onBroadcastText(draftText, draftFilename, draftInitPos);
      setIsEditingRaw(false);
      setFeedback('Texto actualizado en PostgreSQL para todos los ESP32 del salón.');
    }
  };

  const chars = draftText.split('');

  return (
    <div className="rounded-2xl bg-[#121216] border border-white/[0.08] p-6 flex flex-col justify-between space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-display font-semibold text-white">
            Contenido Activo del Salón
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
            {draftFilename} · {chars.length} caracteres · Inicio [{draftInitPos}]
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingRaw((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isEditingRaw ? 'Vista de Caracteres' : 'Escribir Texto'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir .txt</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {isEditingRaw ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">
                Nombre del documento
              </label>
              <input
                type="text"
                value={draftFilename}
                onChange={(e) => setDraftFilename(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">
                Posición inicial
              </label>
              <input
                type="number"
                min={0}
                max={Math.max(0, draftText.length - 1)}
                value={draftInitPos}
                onChange={(e) =>
                  setDraftInitPos(Math.max(0, parseInt(e.target.value || '0', 10)))
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <textarea
            rows={7}
            value={draftText}
            onChange={(e) => {
              setPendingFile(null);
              setDraftText(e.target.value);
            }}
            placeholder="Escribe o pega el texto que leerán los dispositivos ESP32 del salón..."
            className="w-full p-3.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`h-[240px] overflow-y-auto p-4 rounded-xl bg-[#0A0A0C] border transition-colors ${
            isDragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/[0.06]'
          }`}
        >
          {chars.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 text-center">
              <p>Arrastra un archivo .txt aquí o presiona "Escribir Texto".</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 content-start">
              {chars.map((c, idx) => {
                const isActive = idx === globalPosition && !pendingFile && !isEditingRaw;
                const isInit = idx === draftInitPos;
                const shown = c === ' ' ? '␣' : c === '\n' ? '↵' : c === '\t' ? '⇥' : c;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (pendingFile) {
                        setDraftInitPos(idx);
                      } else {
                        onSelectPosition(idx);
                      }
                    }}
                    title={`Índice ${idx} · Clic para saltar o fijar inicio`}
                    className={`min-w-[28px] h-8 px-1.5 rounded-lg font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-zinc-950 font-semibold'
                        : isInit
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-[#16161B] text-zinc-300 hover:bg-[#22222A] hover:text-white'
                    }`}
                  >
                    {shown}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {feedback && (
        <p className="text-xs text-emerald-400">{feedback}</p>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <span className="text-xs text-zinc-500">
          Haz clic en cualquier carácter para saltar a esa posición.
        </span>
        <button
          type="button"
          disabled={isSaving || draftText.length === 0}
          onClick={handlePublish}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Guardando...' : 'Transmitir al Salón'}</span>
        </button>
      </div>
    </div>
  );
};
