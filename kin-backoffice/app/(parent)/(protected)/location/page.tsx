import { PageHeader } from '@/components/parent/page-header'
import { LocationClient } from './components/location-client'

export default function LocationPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <LocationClient />
      </main>
    </div>
  )
}
