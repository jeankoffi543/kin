import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'

export default async function ParentLoginPage() {
  const jar = await cookies()
  if (jar.get('kin_parent_session')?.value) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
