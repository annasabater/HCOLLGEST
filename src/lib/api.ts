/** Helpers de fetch para componentes cliente. Lanzan con el mensaje del API. */

export class ApiError extends Error {
  details?: unknown;
  status: number;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? 'Error', res.status, data.details);
  }
  return data;
}

export async function getJSON<T = unknown>(url: string): Promise<T> {
  return parse(await fetch(url, { cache: 'no-store' }));
}

export async function postJSON<T = unknown>(url: string, body: unknown): Promise<T> {
  return parse(
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function patchJSON<T = unknown>(url: string, body: unknown): Promise<T> {
  return parse(
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function putJSON<T = unknown>(url: string, body: unknown): Promise<T> {
  return parse(
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function delJSON<T = unknown>(url: string): Promise<T> {
  return parse(await fetch(url, { method: 'DELETE' }));
}
