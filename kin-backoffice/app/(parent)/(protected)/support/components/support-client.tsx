'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, Loader2, MessageSquare, Plus, Send } from 'lucide-react'
import * as React from 'react'

interface Conversation {
  id: number
  title: string | null
  status: string
  created_at: string | null
  updated_at: string | null
  messages: ConversationMessage[]
}

interface ConversationMessage {
  id: number
  body: string
  sender_type: string
  sender_name: string | null
  created_at: string | null
}

interface ConversationsResponse {
  data: Conversation[]
}

async function fetchConversations(): Promise<ConversationsResponse> {
  const res = await fetch('/support/api')
  if (!res.ok) throw new Error('Erreur')
  return res.json() as Promise<ConversationsResponse>
}

async function fetchConversation(id: number): Promise<{ data: Conversation }> {
  const res = await fetch(`/support/api?id=${id}`)
  if (!res.ok) throw new Error('Erreur')
  return res.json() as Promise<{ data: Conversation }>
}

async function sendMessage(conversationId: number, body: string): Promise<void> {
  await fetch('/support/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId, body }),
  })
}

async function createConversation(title: string, body: string): Promise<{ data: Conversation }> {
  const res = await fetch('/support/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  })
  return res.json() as Promise<{ data: Conversation }>
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: string) {
  const cfg: Record<string, { bg: string; text: string }> = {
    open: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    closed: { bg: 'bg-gray-100', text: 'text-[#9ca3af]' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600' },
  }
  const c = cfg[status] ?? cfg.open
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold capitalize ${c.bg} ${c.text}`}>
      {status}
    </span>
  )
}

export function SupportClient() {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = React.useState<number | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const [newBody, setNewBody] = React.useState('')
  const [replyBody, setReplyBody] = React.useState('')

  const conversations = useQuery({
    queryKey: ['support-conversations'],
    queryFn: fetchConversations,
  })

  const list = conversations.data?.data ?? []
  const active = list.find((c) => c.id === activeId) ?? null

  const replyMutation = useMutation({
    mutationFn: (args: { id: number; body: string }) => sendMessage(args.id, args.body),
    onSuccess: () => {
      setReplyBody('')
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (args: { title: string; body: string }) => createConversation(args.title, args.body),
    onSuccess: (data) => {
      setCreating(false)
      setNewTitle('')
      setNewBody('')
      setActiveId(data.data.id)
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] })
    },
  })

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!active || !replyBody.trim()) return
    replyMutation.mutate({ id: active.id, body: replyBody.trim() })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newBody.trim()) return
    createMutation.mutate({ title: newTitle.trim(), body: newBody.trim() })
  }

  if (conversations.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-[#9ca3af]" />
      </div>
    )
  }

  return (
    <div className="flex gap-6" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Conversations list */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <h2 className="text-[13px] font-bold text-[#111827]">Conversations</h2>
          <button
            type="button"
            onClick={() => { setCreating(true); setActiveId(null) }}
            className="flex size-7 items-center justify-center rounded-lg text-amber-500 transition-colors hover:bg-amber-500/10"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04]">
          {list.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => { setActiveId(conv.id); setCreating(false) }}
              className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                activeId === conv.id ? 'bg-amber-500/5' : 'hover:bg-[#fafafa]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate text-[12px] font-semibold text-[#111827]">
                  {conv.title ?? `Ticket #${conv.id}`}
                </span>
                {statusBadge(conv.status)}
              </div>
              <span className="text-[10px] text-[#9ca3af]">{formatDate(conv.updated_at)}</span>
            </button>
          ))}
          {list.length === 0 && (
            <div className="py-12 text-center">
              <HelpCircle className="mx-auto mb-2 size-8 text-[#d1d5db]" />
              <p className="text-[12px] text-[#9ca3af]">Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-1 flex-col p-6">
            <h3 className="mb-4 text-[15px] font-bold text-[#111827]">Nouveau ticket</h3>
            <div className="mb-3">
              <label className="mb-1 block text-[12px] font-medium text-[#374151]">Sujet</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Décrivez votre problème en quelques mots"
                className="w-full rounded-lg bg-white px-4 py-2.5 text-[13px] outline-none"
                style={{ border: '1px solid #e5e7eb' }}
              />
            </div>
            <div className="mb-4 flex-1">
              <label className="mb-1 block text-[12px] font-medium text-[#374151]">Message</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Détaillez votre demande…"
                rows={6}
                className="w-full rounded-lg bg-white px-4 py-2.5 text-[13px] outline-none"
                style={{ border: '1px solid #e5e7eb' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-[13px] font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                <Send className="size-4" />
                {createMutation.isPending ? 'Envoi…' : 'Envoyer'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-xl px-4 py-2.5 text-[13px] text-[#6b7280] hover:text-[#374151]"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : active ? (
          <>
            <div className="border-b px-5 py-3.5" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold text-[#111827]">
                  {active.title ?? `Ticket #${active.id}`}
                </h3>
                {statusBadge(active.status)}
              </div>
              <p className="text-[11px] text-[#9ca3af]">{formatDate(active.created_at)}</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {(active.messages ?? []).map((msg) => {
                const isUser = msg.sender_type === 'user' || msg.sender_type === 'User'
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isUser
                          ? 'bg-amber-500 text-black'
                          : 'bg-[#f1f3f7] text-[#374151]'
                      }`}
                    >
                      <p className="text-[12px]">{msg.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          isUser ? 'text-black/50' : 'text-[#9ca3af]'
                        }`}
                      >
                        {msg.sender_name ?? (isUser ? 'Vous' : 'Support')} · {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <form
              onSubmit={handleSendReply}
              className="flex items-center gap-3 border-t px-5 py-3"
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}
            >
              <input
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Votre réponse…"
                className="flex-1 rounded-lg bg-[#f9fafb] px-4 py-2.5 text-[13px] outline-none"
                style={{ border: '1px solid #e5e7eb' }}
              />
              <button
                type="submit"
                disabled={replyMutation.isPending || !replyBody.trim()}
                className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#9ca3af]">
            <MessageSquare className="size-10 opacity-30" />
            <p className="text-[13px]">Sélectionnez une conversation ou créez-en une nouvelle</p>
          </div>
        )}
      </div>
    </div>
  )
}
