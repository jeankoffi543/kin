import { PageHeader } from '@/components/parent/page-header'
import { SupportClient } from './components/support-client'

export default function SupportPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <main className="flex-1 overflow-y-auto p-6">
        <SupportClient />
      </main>
    </div>
  )
}
