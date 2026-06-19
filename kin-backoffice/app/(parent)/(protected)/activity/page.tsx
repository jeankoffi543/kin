import { PageHeader } from '@/components/parent/page-header'
import { ActivityClient } from './components/activity-client'

export default function ActivityPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <ActivityClient />
      </main>
    </div>
  )
}
