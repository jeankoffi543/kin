import { PageHeader } from '@/components/parent/page-header'
import { DevicesClient } from './components/devices-client'

export default function DevicesPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <DevicesClient />
      </main>
    </div>
  )
}
