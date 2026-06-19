import { PageHeader } from '@/components/parent/page-header'
import { LiveActionClient } from './components/live-action-client'

export default function LiveActionPage() {
  // isPremium will be determined client-side via KidContext
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto">
        <LiveActionClient />
      </main>
    </div>
  )
}
