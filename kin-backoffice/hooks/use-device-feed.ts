'use client'

import { useDevice } from '@/contexts/device-context'
import type { ResponseCollection, Meta } from '@/types/api'
import { useQuery } from '@tanstack/react-query'

interface UseDeviceFeedOptions {
  routeBase: string
  feed: string
  queryKey: string
  page?: number
  perPage?: number
  sort?: string
  direction?: 'asc' | 'desc'
  search?: string
  extraParams?: Record<string, string>
  enabled?: boolean
  refetchInterval?: number | false
}

async function fetchFeed<T>(
  routeBase: string,
  feed: string,
  deviceId: number,
  page: number,
  perPage: number,
  sort?: string,
  direction?: string,
  search?: string,
  extraParams?: Record<string, string>,
): Promise<ResponseCollection<T>> {
  const qs = new URLSearchParams({
    device_id: String(deviceId),
    feed,
    page: String(page),
    per_page: String(perPage),
  })
  if (sort) {
    qs.set('sort_by', sort)
    qs.set('sort_desc', direction === 'desc' ? '1' : '0')
  }
  if (search) qs.set('search', search)
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) qs.set(k, v)
    }
  }
  const res = await fetch(`${routeBase}/api?${qs}`)
  if (!res.ok) throw new Error('Erreur lors du chargement')
  return res.json() as Promise<ResponseCollection<T>>
}

export function useDeviceFeed<T>({
  routeBase,
  feed,
  queryKey,
  page = 1,
  perPage = 50,
  sort,
  direction,
  search,
  extraParams,
  enabled = true,
  refetchInterval = false,
}: UseDeviceFeedOptions) {
  const { activeDevice } = useDevice()
  const deviceId = activeDevice?.id ?? 0

  return useQuery<ResponseCollection<T>>({
    queryKey: [queryKey, deviceId, feed, page, perPage, sort, direction, search, extraParams],
    queryFn: () => fetchFeed<T>(routeBase, feed, deviceId, page, perPage, sort, direction, search, extraParams),
    enabled: enabled && deviceId > 0,
    placeholderData: (prev) => prev,
    refetchInterval,
  })
}
