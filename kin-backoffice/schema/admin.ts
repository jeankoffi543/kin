import { z } from 'zod'

export const adminRoles = ['admin', 'support'] as const
export type AdminRole = (typeof adminRoles)[number]

export interface Admin {
  id: number
  name: string
  email: string
  role: AdminRole
  created_at: string
  updated_at: string
}

export const createInputSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  role: z.enum(adminRoles, { error: 'Rôle invalide' }),
})

export const editInputSchema = z.object({
  _method: z.literal('PUT'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  email: z.string().email('Email invalide').optional(),
  password: z.string().min(8, 'Minimum 8 caractères').optional().or(z.literal('')),
  role: z.enum(adminRoles, { error: 'Rôle invalide' }).optional(),
})

export type CreateInput = z.infer<typeof createInputSchema>
export type EditInput = z.infer<typeof editInputSchema>
