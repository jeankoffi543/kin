import type { ResponseCollection } from '@/types/api'
import type { Admin } from '@/schema/admin'
import { ownerFetch } from '@/lib/api'
import { AdminListing } from './components/listing'

async function getAdmins(): Promise<ResponseCollection<Admin>> {
  const res = await ownerFetch('/api/admin/admins')
  if (!res.ok) {
    return { data: [], meta: { current_page: 1, from: 0, last_page: 1, per_page: 10, to: 0, total: 0 } }
  }
  return res.json()
}

export default async function AdminsPage() {
  const initialData = await getAdmins()

  return (
    <div className="p-6">
      <AdminListing initialData={initialData} />
    </div>
  )
}
