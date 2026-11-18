import {
  AuthResponse,
  Esp32Device,
  RoomDetail,
  RoomSummary,
  Tenant,
  User,
} from '../types';

const TOKEN_STORAGE_KEY = 'braille_saas_jwt';
const API_BASE_STORAGE_KEY = 'braille_saas_api_base';
const SESSION_ID_STORAGE_KEY = 'braille_global_session_id';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getApiBaseUrl(): string {
  const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
  if (stored !== null) {
    return stored.replace(/\/+$/, '');
  }
  const envBase = import.meta.env.VITE_API_BASE_URL || '';
  return envBase.replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned) {
    localStorage.setItem(API_BASE_STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(API_BASE_STORAGE_KEY);
  }
}

export function getGlobalSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `pc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_ID_STORAGE_KEY, id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getStoredToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'No se pudo establecer conexión con el servidor FastAPI. Verifica la URL del backend o que el servicio esté activo.',
      0
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      `Error HTTP ${response.status} al consultar ${path}`;
    throw new ApiError(
      typeof detail === 'string' ? detail : JSON.stringify(detail),
      response.status
    );
  }

  return data as T;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/api/health'),

  registerTenant: (payload: {
    tenant_name: string;
    full_name: string;
    email: string;
    password: string;
  }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<{ user: User; tenant: Tenant }>('/api/auth/me'),

  listUsers: () => request<User[]>('/api/tenants/users'),

  createUser: (payload: {
    full_name: string;
    email: string;
    password: string;
    role: 'admin' | 'docente';
  }) =>
    request<User>('/api/tenants/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listRooms: () => request<RoomSummary[]>('/api/rooms'),

  createRoom: (payload: {
    name: string;
    description: string;
    wifi_ssid: string;
    strict_ip_check: boolean;
  }) =>
    request<RoomDetail>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRoom: (roomId: number) => request<RoomDetail>(`/api/rooms/${roomId}`),

  updateRoom: (
    roomId: number,
    payload: {
      name?: string;
      description?: string;
      wifi_ssid?: string;
      allowed_public_ip?: string;
      strict_ip_check?: boolean;
      sync_mode?: boolean;
    }
  ) =>
    request<RoomDetail>(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteRoom: (roomId: number) =>
    request<void>(`/api/rooms/${roomId}`, { method: 'DELETE' }),

  linkGlobalComputer: (
    roomId: number,
    payload: { session_id: string; computer_label: string }
  ) =>
    request<RoomDetail>(`/api/rooms/${roomId}/link-global`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  heartbeatGlobalComputer: (
    roomId: number,
    payload: { session_id: string; computer_label: string }
  ) =>
    request<{
      linked: boolean;
      active_session_id?: string | null;
      active_label?: string | null;
    }>(`/api/rooms/${roomId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRoomText: (
    roomId: number,
    payload: { text: string; filename: string; initial_position: number }
  ) =>
    request<RoomDetail>(`/api/rooms/${roomId}/text`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadRoomTxtFile: (roomId: number, file: File, initialPosition: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('posicion_inicial', String(initialPosition));
    return request<RoomDetail>(`/api/rooms/${roomId}/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  controlRoom: (roomId: number, action: 'inicio' | 'siguiente' | 'anterior') =>
    request<RoomDetail>(`/api/rooms/${roomId}/control/${action}`, {
      method: 'POST',
    }),

  setRoomPosition: (roomId: number, position: number) =>
    request<RoomDetail>(`/api/rooms/${roomId}/set-position`, {
      method: 'POST',
      body: JSON.stringify({ position }),
    }),

  registerDevice: (roomId: number, name: string) =>
    request<Esp32Device>(`/api/rooms/${roomId}/devices`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  updateDevice: (
    deviceId: number,
    payload: { name?: string; is_active?: boolean; rotate_token?: boolean }
  ) =>
    request<Esp32Device>(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteDevice: (deviceId: number) =>
    request<void>(`/api/devices/${deviceId}`, { method: 'DELETE' }),
};
