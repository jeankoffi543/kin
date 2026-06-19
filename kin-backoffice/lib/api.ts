import { getOwnerToken, getParentToken } from '@/lib/session'

const API_URL = process.env.API_URL!

async function apiFetch(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

export async function ownerFetch(path: string, init?: RequestInit) {
  const token = await getOwnerToken()
  return apiFetch(path, token, init)
}

export async function parentFetch(path: string, init?: RequestInit) {
  const token = await getParentToken()
  return apiFetch(path, token, init)
}

export function callApi<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
) {
  return async (...args: Args): Promise<[unknown, R?]> => {
    try {
      return [null, await fn(...args)]
    } catch (e) {
      return [e]
    }
  }
}

export function getPaginationFromResponse<T>(r: { meta: { current_page: number; per_page: number; last_page: number } }) {
  return {
    pageIndex: r.meta.current_page - 1,
    pageSize: r.meta.per_page,
    pageCount: r.meta.last_page,
  }
}
