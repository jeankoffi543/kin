'use client'

import type { FormState } from '@/types/api'
import type { DefaultValues, FieldValues } from 'react-hook-form'
import jsonToFormData from 'json-form-data'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type ActionFormFieldValues = FieldValues & { _method?: 'POST' | 'PUT' }

interface UseActionFormProps<Input extends ActionFormFieldValues, Output> {
  formDefaultValues: DefaultValues<Input>
  action: (
    state: FormState<Output>,
    payload: FormData,
  ) => FormState<Output> | Promise<FormState<Output>>
  onSuccess?: (data?: Output) => void
  defaultState?: FormState<Output>
  values?: Input
}

export function useActionForm<Input extends ActionFormFieldValues, Output>({
  formDefaultValues,
  action,
  onSuccess,
  defaultState = { success: false },
  values,
}: UseActionFormProps<Input, Output>) {
  const form = useForm<Input>({
    defaultValues: formDefaultValues,
    values,
  })

  const [state, handle, pending] = React.useActionState<FormState<Output>, FormData>(
    action,
    defaultState,
  )

  // Distribute server-side validation errors to form fields
  React.useEffect(() => {
    if (!state.errors) return
    Object.entries(state.errors).forEach(([field, messages]) => {
      form.setError(field as Parameters<typeof form.setError>[0], {
        type: 'server',
        message: Array.isArray(messages) ? messages.join(' | ') : String(messages),
      })
    })
  }, [state.errors, form])

  // Success callback
  React.useEffect(() => {
    if (state.success) {
      onSuccess?.(state.data)
    }
  }, [state.success, state.data])

  // Toast on message
  React.useEffect(() => {
    if (state.message && !state.success) {
      toast.error(state.message)
    }
  }, [state.message, state.errors])

  const submit = (evt?: React.FormEvent<HTMLFormElement>) => {
    evt?.preventDefault()
    form.clearErrors()
    form.handleSubmit((data) => {
      const initial = new FormData()
      let payload: Partial<Input> = {}

      if (data._method === 'PUT') {
        initial.append('_method', 'PUT')
        for (const key in form.formState.dirtyFields) {
          if (form.formState.dirtyFields[key]) {
            payload[key] = data[key]
          }
        }
      } else {
        payload = data
      }

      const formData = jsonToFormData(payload, { initialFormData: initial })
      if (Array.from(formData.values()).length > 0) {
        React.startTransition(() => handle(formData))
      }
    })(evt)
  }

  return { form, submit, pending }
}
