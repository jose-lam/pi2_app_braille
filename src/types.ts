export type BrailleCell = [boolean, boolean, boolean, boolean, boolean, boolean];

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface User {
  id: number;
  tenant_id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'docente' | string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  tenant: Tenant;
}

export interface BrailleSnapshot {
  char: string;
  position: number;
  braille: BrailleCell;
  totalLength: number;
  posicion_inicial: number;
  unicodeBraille: string;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Esp32Device {
  id: number;
  tenant_id: number;
  room_id: number;
  name: string;
  device_token: string;
  current_position: number;
  current_char: string;
  braille: BrailleCell;
  unicode_braille: string;
  last_seen: string | null;
  last_ip: string | null;
  is_online: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RoomSummary {
  id: number;
  tenant_id: number;
  name: string;
  description: string;
  wifi_ssid: string;
  allowed_public_ip: string | null;
  strict_ip_check: boolean;
  global_session_id: string | null;
  global_computer_label: string | null;
  global_last_seen: string | null;
  global_online: boolean;
  filename: string;
  sync_mode: boolean;
  total_length: number;
  global_position: number;
  device_count: number;
  online_device_count: number;
  updated_at: string;
}

export interface RoomDetail extends RoomSummary {
  current_text: string;
  initial_position: number;
  braille_state: BrailleSnapshot;
  devices: Esp32Device[];
}
