import { PageHeader } from '@/components/parent/page-header'
import { NotificationsClient } from './components/notifications-client'

export default function NotificationsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <NotificationsClient />
      </main>
    </div>
  )
}
