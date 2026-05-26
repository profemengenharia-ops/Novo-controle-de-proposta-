/**
 * Configuração centralizada da integração de IA (Gemini).
 * Permite trocar o modelo via env var sem editar callsites.
 */
export const GEMINI_MODEL: string =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
