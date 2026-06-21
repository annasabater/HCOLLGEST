/**
 * Control de acceso por roles (RBAC).
 *   - CONSULTA : solo lectura.
 *   - RECEPCIO : lectura + operaciones del día a día (huéspedes, estancias, envíos…).
 *   - ADMIN    : todo, incluida configuración y gestión de usuarios.
 */
import type { Role } from '@prisma/client';

export const ROLES_ALL: Role[] = ['ADMIN', 'RECEPCIO', 'CONSULTA'];
export const ROLES_WRITE: Role[] = ['ADMIN', 'RECEPCIO'];
export const ROLES_ADMIN: Role[] = ['ADMIN'];

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
