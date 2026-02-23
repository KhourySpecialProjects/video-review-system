# Frontend — Angelman Video Portal

React SPA built with Vite, React Router v7 (data layer mode), Tailwind CSS v4, and shadcn/ui.

---

## Getting Started

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Set environment variables

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8080
```

### 3. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

---

## File Structure

```
frontend/
├── index.html                  # Vite entry point — do not delete
├── vite.config.ts              # Vite config — path alias (@/), React plugin
├── tsconfig.json               # TypeScript config — strict mode, src/ include
├── nginx.conf                  # nginx config for Docker — SPA fallback routing
├── components.json             # shadcn/ui config — managed by shadcn MCP server
│
└── src/
    ├── main.tsx                # App entry — mounts RouterProvider into #root
    ├── root.tsx                # Root layout — wraps all routes with <Outlet />
    ├── routes.tsx              # Route tree — createBrowserRouter definition
    ├── globals.css             # Tailwind v4 @theme, color tokens, shadow variables
    │
    ├── routes/                 # One file per route
    │   ├── index.tsx           # "/" — redirects based on role
    │   ├── login.tsx           # "/login"
    │   ├── not-found.tsx       # Catch-all 404
    │   ├── caregiver/          # "/caregiver/*"
    │   ├── reviewer/           # "/reviewer/*"
    │   ├── coordinator/        # "/coordinator/*"
    │   └── admin/              # "/admin/*"
    │
    ├── features/               # Self-contained domain modules
    │   ├── auth/               # AuthContext, AuthGuard, login API
    │   ├── videos/             # Player, upload, clip, annotate, notes
    │   ├── accounts/           # Account management forms and table
    │   └── audit/              # Audit log table and filters
    │
    ├── components/             # Shared UI — no business logic
    │   ├── layout/             # AppShell, Sidebar, PageHeader, MobileNav
    │   ├── ui/                 # shadcn/ui components (do not hand-edit)
    │   └── feedback/           # EmptyState, ErrorMessage, LoadingSpinner
    │
    ├── lib/
    │   ├── api-client.ts       # Base fetch wrapper — auth headers, base URL
    │   └── utils.ts            # cn() and shared utilities
    │
    └── types/
        └── index.ts            # Global shared TypeScript types
```

---

## Key Conventions

**Routing — data layer mode**
React Router v7 is used as a plain client-side library. There is no SSR or file-based routing. All routes are defined manually in `src/routes.tsx` using `createBrowserRouter`. Each route file exports a default component and optional named `loader` and `action` exports.

```ts
// Example route file shape
export async function loader({ params }: LoaderFunctionArgs) { ... }
export async function action({ request }: ActionFunctionArgs) { ... }
export default function MyPage() { ... }
```

**Features vs Components**
`features/` modules know about the domain — they call the API and use domain types. `components/` are purely presentational and reusable across features with no API calls or domain knowledge.

**shadcn/ui**
All components in `src/components/ui/` are scaffolded by the shadcn MCP server. Do not hand-edit these files. To add a new shadcn component, use the shadcn CLI or MCP server.

**Path alias**
`@/` resolves to `src/`. Use it for all imports to avoid relative path chains.

```ts
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
```

**Styling**
Use project color tokens — never raw Tailwind palette values like `gray-800` or `blue-500`. All tokens are defined in `globals.css` and available as Tailwind utilities.

```html
<!-- Correct -->
<div class="bg-bg text-text border-border">

<!-- Wrong -->
<div class="bg-gray-900 text-white border-gray-700">
```

---

## Docker

Build and run the frontend in Docker:

```bash
docker build -t angelman-frontend ./frontend
docker run -p 3000:80 angelman-frontend
```

The nginx config in `nginx.conf` handles SPA fallback routing so React Router can manage all client-side navigation correctly.

---

## AWS Amplify Deployment

1. Connect the GitHub repository in the Amplify Console
2. Set build root directory to `frontend/`
3. Add environment variable: `VITE_API_URL=https://your-app-runner-url`