export interface Visit {
  nombre: string;
  telefono?: string;
  fecha: string; // ISO 8601 date: YYYY-MM-DD
  hora: string;  // HH:mm
  motivo?: string;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
