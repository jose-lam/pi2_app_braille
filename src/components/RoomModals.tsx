import React, { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { api } from '../api/client';
import { Esp32Device, RoomDetail, User } from '../types';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-2xl bg-[#121216] border border-white/[0.1] p-6 space-y-5 relative">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div>
        <h3 className="text-base font-display font-semibold text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  </div>
);

interface NewRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    description: string;
    wifi_ssid: string;
    strict_ip_check: boolean;
  }) => Promise<void>;
}

export const NewRoomModal: React.FC<NewRoomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [strictIp, setStrictIp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim(),
        wifi_ssid: wifiSsid.trim(),
        strict_ip_check: strictIp,
      });
      setName('');
      setDescription('');
      setWifiSsid('');
      onClose();
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Error al crear salón.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Crear Nuevo Salón"
      subtitle="Cada salón mantiene su texto, Wi-Fi autorizado y flota ESP32."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Nombre del Salón
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Laboratorio Braille 202"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Descripción (Opcional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Aula de primer grado"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            SSID Wi-Fi del Salón
          </label>
          <input
            type="text"
            value={wifiSsid}
            onChange={(e) => setWifiSsid(e.target.value)}
            placeholder="Ej. Aula_202_WiFi"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={strictIp}
            onChange={(e) => setStrictIp(e.target.checked)}
            className="rounded accent-emerald-500"
          />
          <span>Activar bloqueo estricto por IP pública de la Computadora Global</span>
        </label>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Creando...' : 'Crear Salón'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

interface RoomNetworkModalProps {
  isOpen: boolean;
  room: RoomDetail;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    wifi_ssid: string;
    allowed_public_ip: string;
    strict_ip_check: boolean;
  }) => Promise<void>;
}

export const RoomNetworkModal: React.FC<RoomNetworkModalProps> = ({
  isOpen,
  room,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(room.name);
  const [wifiSsid, setWifiSsid] = useState(room.wifi_ssid);
  const [allowedIp, setAllowedIp] = useState(room.allowed_public_ip || '');
  const [strictIp, setStrictIp] = useState(room.strict_ip_check);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(room.name);
    setWifiSsid(room.wifi_ssid);
    setAllowedIp(room.allowed_public_ip || '');
    setStrictIp(room.strict_ip_check);
  }, [room]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        wifi_ssid: wifiSsid.trim(),
        allowed_public_ip: allowedIp.trim(),
        strict_ip_check: strictIp,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Red y Seguridad del Salón"
      subtitle="Define el Wi-Fi del aula y la validación de IP para los ESP32."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Nombre del Salón
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Wi-Fi Autorizado (SSID)
          </label>
          <input
            type="text"
            value={wifiSsid}
            onChange={(e) => setWifiSsid(e.target.value)}
            placeholder="SSID que usarán los ESP32 en el Portal Cautivo"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            IP Pública Permitida del Salón
          </label>
          <input
            type="text"
            value={allowedIp}
            onChange={(e) => setAllowedIp(e.target.value)}
            placeholder="Se captura automáticamente al vincular Computadora Global"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={strictIp}
            onChange={(e) => setStrictIp(e.target.checked)}
            className="rounded mt-0.5 accent-emerald-500"
          />
          <span>
            Exigir coincidencia exacta de IP pública para que los ESP32 reciban
            lectura (HTTP 403 si provienen de otra red).
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

interface AddDeviceModalProps {
  isOpen: boolean;
  roomName: string;
  wifiSsid: string;
  onClose: () => void;
  onRegister: (name: string) => Promise<Esp32Device>;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  roomName,
  wifiSsid,
  onClose,
  onRegister,
}) => {
  const [deviceName, setDeviceName] = useState('');
  const [createdDevice, setCreatedDevice] = useState<Esp32Device | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setDeviceName('');
    setCreatedDevice(null);
    setErr(null);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const dev = await onRegister(deviceName.trim());
      setCreatedDevice(dev);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Error al vincular ESP32.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={createdDevice ? 'ESP32 Registrado' : `Vincular ESP32 a ${roomName}`}
      subtitle={
        createdDevice
          ? 'Ingresa este token en el portal cautivo 192.168.4.1 del dispositivo.'
          : 'Genera un token criptográfico único para este pupitre.'
      }
      onClose={handleClose}
    >
      {createdDevice ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0A0A0C] border border-white/[0.08] space-y-2">
            <p className="text-xs text-zinc-400">Header X-ESP32-Token</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-emerald-400 break-all">
                {createdDevice.device_token}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdDevice.device_token);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white shrink-0 cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Conéctate al Wi-Fi <strong className="text-white">BrailleReader-Setup</strong>,
            abre <code className="text-zinc-200">192.168.4.1</code>, ingresa la red{' '}
            <strong className="text-white">{wifiSsid || 'del salón'}</strong> y pega
            este token.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nombre Identificador del Pupitre
            </label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Ej. Pupitre 1 - Fila A"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Generando...' : 'Generar Token'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
};

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'docente' | 'admin'>('docente');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api
        .listUsers()
        .then(setUsers)
        .catch((e) => setErr(e.message));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const created = await api.createUser({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });
      setUsers((prev) => [...prev, created]);
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Error al agregar docente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Docentes y Administradores"
      subtitle="Usuarios aislados dentro de tu misma institución."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between text-xs py-2 border-b border-white/[0.06]"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{u.full_name}</p>
                <p className="text-zinc-500 truncate">{u.email}</p>
              </div>
              <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                {u.role}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddUser} className="space-y-3 pt-2 border-t border-white/[0.06]">
          <p className="text-xs font-medium text-zinc-300">Agregar miembro</p>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@institucion.edu"
            className="w-full px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (6+)"
              className="w-full px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'docente' | 'admin')}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0A0C] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="docente">Docente</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Creando usuario...' : 'Registrar Usuario'}
          </button>
        </form>
      </div>
    </ModalShell>
  );
};
