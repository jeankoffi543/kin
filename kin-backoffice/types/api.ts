export interface FormState<T = unknown> {
  success: boolean
  status?: number
  message?: string
  data?: T
  errors?: Record<string, string[]>
}

export interface Meta {
  current_page: number
  from: number
  last_page: number
  per_page: number
  to: number
  total: number
}

export interface ResponseCollection<T> {
  data: T[]
  meta: Meta
}

export interface ResponseJson<T> {
  data: T
}
