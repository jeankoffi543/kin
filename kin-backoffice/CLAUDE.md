@AGENTS.md

# Conventions backoffice — kin-backoffice

> Les instructions ci-dessous sont génériques et applicables à tout projet Next.js backoffice.
> Les fichiers modèles se trouvent dans `_templates/` à la racine du projet.
> Pour un nouveau projet, copier les fichiers correspondants et remplacer les TODO.

---

## Important : @base-ui/react (pas Radix)

Les composants shadcn de ce projet utilisent `@base-ui/react` au lieu de `@radix-ui` :

- `DropdownMenuTrigger`, `DialogTrigger` **n'ont pas de prop `asChild`** — ils rendent déjà un `<button>`. Passer `className` directement sur le trigger.
- `Checkbox` : pas de `checked="indeterminate"` — utiliser `indeterminate={bool}` (prop séparée).
- `Select.onValueChange` : signature `(value: T | null, eventDetails) => void` — toujours gérer le `null`.

---

## Structure de chaque page ressource (obligatoire)

```
app/(space)/[resource]/
├── api/
│   └── route.ts          → voir _templates/resource/api/route.ts
├── [id]/
│   └── api/
│       └── route.ts      → voir _templates/resource/[id]/api/route.ts
├── components/
│   ├── actions.tsx       → voir _templates/resource/components/actions.tsx
│   ├── columns.tsx       → voir _templates/resource/components/columns.tsx
│   ├── filters.tsx       → voir _templates/resource/components/filters.tsx
│   └── listing.tsx       → voir _templates/resource/components/listing.tsx
└── page.tsx              → voir _templates/resource/page.tsx
```

**Exemple complet implémenté** : `app/owner/admins/`

---

## Fichiers d'infrastructure à copier pour un nouveau projet

| Fichier template | Destination dans le projet | Rôle |
|---|---|---|
| `_templates/types/api.ts` | `types/api.ts` | `FormState`, `ResponseCollection`, `Meta` |
| `_templates/lib/utils.ts` | `lib/utils.ts` | `cn()` |
| `_templates/lib/session.ts` | `lib/session.ts` | Lecture token depuis cookie |
| `_templates/lib/api.ts` | `lib/api.ts` | `adminFetch`, `userFetch` avec Bearer |
| `_templates/hooks/use-action-form.ts` | `hooks/use-action-form.ts` | Formulaire + Server Action + erreurs Laravel |
| `_templates/hooks/use-file-upload.ts` | `hooks/use-file-upload.ts` | Upload fichier avec preview |
| `_templates/hooks/use-debounce.ts` | `hooks/use-debounce.ts` | Debounce input |
| `_templates/blocks/data-table.tsx` | `blocks/data-table.tsx` | Table complète (tri, pagination, search) |
| `_templates/components/ui/field.tsx` | `components/ui/field.tsx` | `Field`, `FieldLabel`, `FieldError` |
| `_templates/components/ui/spinner.tsx` | `components/ui/spinner.tsx` | `Spinner` (Loader2 animé) |
| `_templates/components/ui/item.tsx` | `components/ui/item.tsx` | `Item`, `ItemMedia`, `ItemContent` |
| `_templates/providers.tsx` | `app/providers.tsx` | `QueryClientProvider` |

---

## Fichiers à créer par ressource CRUD

| Fichier template | Rôle |
|---|---|
| `_templates/schema/resource.ts` | Schéma zod + types TypeScript |
| `_templates/server-actions/resource.ts` | Server Actions create / update / delete |
| `_templates/resource/api/route.ts` | Route Handler GET liste |
| `_templates/resource/[id]/api/route.ts` | Route Handler GET item |
| `_templates/resource/page.tsx` | Server Component avec `initialData` |
| `_templates/resource/components/listing.tsx` | Client : `useQuery` + `DataTable` |
| `_templates/resource/components/actions.tsx` | Create / Edit / Delete + optimistic cache |
| `_templates/resource/components/columns.tsx` | `useColumns()` avec `ColumnDef[]` |
| `_templates/resource/components/filters.tsx` | Filtres (Select, etc.) |

---

## Stack obligatoire

| Besoin | Solution |
|---|---|
| Composants UI | shadcn/ui (`@base-ui/react`) |
| Formulaires | `react-hook-form` + `Controller` + `useActionForm` |
| Validation | `zod` (locale) + erreurs Laravel via `FormState.errors` |
| Requêtes client | `@tanstack/react-query` (`initialData` + optimistic updates) |
| Table | `@tanstack/react-table` + `blocks/data-table.tsx` |
| Icons | `lucide-react` |
| Toast | `sonner` |
| FormData | `json-form-data` (objet → FormData pour multipart/file) |
| Debounce | `hooks/use-debounce.ts` |

---

## Packages à installer dans un nouveau projet

```bash
pnpm add @tanstack/react-query @tanstack/react-table react-hook-form json-form-data zod lucide-react sonner @uidotdev/usehooks class-variance-authority clsx tailwind-merge
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button dialog dropdown-menu input select checkbox table pagination label separator badge card sheet
```

---

## Cookies de session (kin-backoffice)

- Owner (admin SaaS) : `kin_owner_session` = JSON `{ token, admin_id, email, role, name }`
- Parent : `kin_parent_session` = JSON `{ token, user_id, email, name }`
- Helpers : `lib/session.ts` → `getOwnerToken()`, `getParentToken()`
- Fetch : `ownerFetch(path, init?)` et `parentFetch(path, init?)` dans `lib/api.ts`

> Pour un autre projet : adapter les noms de cookies dans `_templates/lib/session.ts`.
