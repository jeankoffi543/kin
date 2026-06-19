import { PageHeader } from '@/components/parent/page-header'
import { TelephonyClient } from './components/telephony-client'

export default function TelephonyPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <TelephonyClient />
      </main>
    </div>
  )
}
