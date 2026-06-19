import { PageHeader } from '@/components/parent/page-header'
import { MessagingClient } from './components/messaging-client'

export default function MessagingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader />
      <MessagingClient />
    </div>
  )
}
