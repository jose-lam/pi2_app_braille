export type BrailleCell = [boolean, boolean, boolean, boolean, boolean, boolean];

export interface BrailleResponse {
  char: string;
  position: number;
  braille: BrailleCell;
  totalLength: number;
  posicion_inicial: number;
  unicodeBraille?: string;
  hasNext?: boolean;
  hasPrev?: boolean;
  error?: string;
  message?: string;
}

export interface FullSystemState extends BrailleResponse {
  currentText: string;
  filename: string;
  updatedAt?: string;
}

export interface ApiConfig {
  defaultToken: string;
  allowedIp: string;
  serverTime: string;
}

export interface HardwareLog {
  id: string;
  timestamp: string;
  action: 'inicio' | 'siguiente' | 'anterior' | 'upload';
  char: string;
  position: number;
  braille: BrailleCell;
  status: number;
  responseTimeMs: number;
}
