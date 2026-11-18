import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { ESP32_FIRMWARE_INO } from '../data/firmwareTemplate';

interface FirmwareAndDeployViewProps {
  mode: 'firmware' | 'deploy';
  onBack?: () => void;
}

const DEPLOY_GUIDE_STEPS = [
  {
    title: '01. Lanzar Instancia EC2 y Security Group (AWS Academy)',
    detail:
      'Crea una instancia Ubuntu Server 24.04 LTS (t3.small o t3.micro). Abre los puertos TCP 22 (SSH desde tu IP), 80 (HTTP para Nginx y ESP32), 443 (HTTPS) y 8000 (pruebas directas opcionales).',
    cmd: 'ssh -i tu-llave.pem ubuntu@<IP_PUBLICA_EC2>',
  },
  {
    title: '02. Instalar Python 3.11+, PostgreSQL, Nginx y Node.js',
    detail:
      'Instala todo el stack directamente en la máquina virtual Ubuntu (cero serverless, latencia < 300 ms).',
    cmd: `sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs`,
  },
  {
    title: '03. Crear Base de Datos PostgreSQL Real',
    detail:
      'Crea el rol y base de datos relacional donde vivirán Tenants, Usuarios, Salones y Tokens de ESP32.',
    cmd: `sudo -u postgres psql -c "CREATE USER braille_user WITH PASSWORD 'BrailleSecurePass2026!';"
sudo -u postgres psql -c "CREATE DATABASE braille_saas OWNER braille_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE braille_saas TO braille_user;"`,
  },
  {
    title: '04. Configurar Backend FastAPI y Variables de Entorno',
    detail:
      'Crea el entorno virtual, instala requirements.txt y configura .env con DATABASE_URL y JWT_SECRET_KEY.',
    cmd: `cd /opt/braille-saas/backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env`,
  },
  {
    title: '05. Compilar Frontend y Configurar Nginx como Proxy Inverso',
    detail:
      'Nginx sirve los archivos estáticos de dist/ en el puerto 80 y reenvía /api/* a 127.0.0.1:8000 manteniendo la IP real en X-Forwarded-For.',
    cmd: `cd /opt/braille-saas && npm install && npm run build
sudo mkdir -p /var/www/braille-saas && sudo cp -r dist /var/www/braille-saas/
sudo cp deploy/nginx.conf /etc/nginx/sites-available/braille-saas
sudo ln -sf /etc/nginx/sites-available/braille-saas /etc/nginx/sites-enabled/braille-saas
sudo rm -f /etc/nginx/sites-enabled/default && sudo nginx -t && sudo systemctl restart nginx`,
  },
  {
    title: '06. Servicio systemd con Gunicorn + UvicornWorker',
    detail:
      'Mantiene el backend FastAPI activo tras reinicios y con 4 workers concurrentes sin cold starts.',
    cmd: `sudo cp /opt/braille-saas/deploy/braille-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable braille-backend
sudo systemctl start braille-backend`,
  },
];

export const FirmwareAndDeployView: React.FC<FirmwareAndDeployViewProps> = ({
  mode,
  onBack,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const downloadIno = () => {
    const blob = new Blob([ESP32_FIRMWARE_INO], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'braille_esp32.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'firmware') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-white">
              Firmware ESP32 con Portal Cautivo y Preferences.h
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Botones INPUT_PULLUP (15, 2, 0) · 5 actuadores físicos (23, 33, 26, 32, 25) · Mantener GPIO 15 por 5s para abrir BrailleReader-Setup (192.168.4.1).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white cursor-pointer"
              >
                Volver
              </button>
            )}
            <button
              type="button"
              onClick={() => copyText(ESP32_FIRMWARE_INO, 'ino')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white cursor-pointer"
            >
              {copiedKey === 'ino' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'ino' ? 'Copiado' : 'Copiar Código'}</span>
            </button>
            <button
              type="button"
              onClick={downloadIno}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .ino</span>
            </button>
          </div>
        </div>

        <pre className="rounded-2xl bg-[#121216] border border-white/[0.08] p-5 text-xs font-mono text-zinc-200 overflow-x-auto max-h-[640px] leading-relaxed">
          <code>{ESP32_FIRMWARE_INO}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-white">
            Despliegue en AWS Academy (Amazon EC2 · Ubuntu + PostgreSQL + Nginx)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Arquitectura de máquina virtual dedicada sin cold starts para latencia menor a 300 ms.
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white cursor-pointer"
          >
            Volver
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DEPLOY_GUIDE_STEPS.map((step, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-[#121216] border border-white/[0.08] p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <h2 className="text-sm font-display font-semibold text-white">
                {step.title}
              </h2>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {step.detail}
              </p>
            </div>
            <div className="relative">
              <pre className="rounded-xl bg-[#0A0A0C] border border-white/[0.06] p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                <code>{step.cmd}</code>
              </pre>
              <button
                type="button"
                onClick={() => copyText(step.cmd, `step-${idx}`)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-[#18181D] text-zinc-400 hover:text-white cursor-pointer"
              >
                {copiedKey === `step-${idx}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
