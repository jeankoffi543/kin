import { PageHeader } from '@/components/parent/page-header'
import { DashboardClient } from './components/dashboard-client'

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <DashboardClient />
      </main>
    </div>
  )
}
