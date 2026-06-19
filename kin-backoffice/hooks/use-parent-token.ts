'use client'

import * as React from 'react'

export function useParentToken(): string | null {
  const [token, setToken] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch('/auth/api')
      .then((r) => r.json())
      .then((data: { token: string | null }) => setToken(data.token))
      .catch(() => setToken(null))
  }, [])

  return token
}
