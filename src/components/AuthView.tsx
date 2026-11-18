import React, { useState } from 'react';
import { ArrowRight, Cpu, Server, ShieldCheck } from 'lucide-react';
import { api, getApiBaseUrl, setApiBaseUrl, setStoredToken } from '../api/client';
import { AuthResponse } from '../types';

interface AuthViewProps {
  onAuthenticated: (auth: AuthResponse) => void;
  onOpenDocs: (tab: 'firmware' | 'deploy') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthenticated,
  onOpenDocs,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setApiBaseUrl(apiUrl);
    setIsSubmitting(true);

    try {
      let auth: AuthResponse;
      if (mode === 'register') {
        auth = await api.registerTenant({
          tenant_name: tenantName.trim(),
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        });
      } else {
        auth = await api.login({
          email: email.trim(),
          password,
        });
      }
      setStoredToken(auth.access_token);
      onAuthenticated(auth);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo completar la autenticación.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7] flex flex-col justify-between px-6 py-8">
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-8">
        <span className="text-lg font-display font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
          BrailleCloud
        </span>
        <nav className="flex items-center gap-6 text-sm text-zinc-400">
          <button
            type="button"
            onClick={() => onOpenDocs('firmware')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Firmware ESP32
          </button>
          <button
            type="button"
            onClick={() => onOpenDocs('deploy')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Despliegue AWS EC2
          </button>
        </nav>
      </header>

      <main className="max-w-5xl w-full mx-auto my-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight text-white leading-[1.1] text-balance">
            Lectura Braille sincronizada para cada salón.
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-lg">
            Plataforma multi-tenant para instituciones educativas. Vincula una
            computadora global por aula, administra múltiples dispositivos ESP32
            con tokens dedicados y transmite textos en tiempo real.
          </p>

          <div className="pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Aislamiento por Institución</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Cada tenant opera sus propios salones, redes Wi-Fi autorizadas y
                flota ESP32 con PostgreSQL y JWT.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Portal Cautivo en Flash</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Cero credenciales quemadas en firmware. Configura cada ESP32
                desde 192.168.4.1 manteniendo GPIO 15.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl bg-[#121216] border border-white/[0.08] p-7 sm:p-8">
            <div className="flex items-center gap-1 p-1 bg-[#0A0A0C] rounded-xl border border-white/[0.06] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#1C1C22] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#1C1C22] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Registrar Institución
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Nombre de la Empresa o Institución
                    </label>
                    <input
                      type="text"
                      required
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Instituto Educativo San Marcos"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Nombre del Administrador
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dra. Elena Vargas"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="docente@institucion.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowServerConfig((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>
                    {showServerConfig
                      ? 'Ocultar configuración de endpoint'
                      : 'Configurar URL del servidor FastAPI'}
                  </span>
                </button>

                {showServerConfig && (
                  <div className="mt-2">
                    <input
                      type="url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="Vacío = mismo origen (/api) o http://IP_EC2"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {isSubmitting
                    ? 'Conectando...'
                    : mode === 'register'
                    ? 'Crear Institución y Entrar'
                    : 'Entrar a la Plataforma'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
        <span>BrailleCloud SaaS · FastAPI + PostgreSQL + ESP32</span>
        <span>Despliegue optimizado para Amazon EC2 + Nginx</span>
      </footer>
    </div>
  );
};
