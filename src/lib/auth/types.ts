import type { Role } from '@prisma/client';

/** Datos de usuario embebidos en el JWT de sesión (no incluye el hash). */
export interface SessionUser {
  id: string;
  email: string;
  nom: string;
  role: Role;
}

export const SESSION_COOKIE = 'hostalcoll_session';
