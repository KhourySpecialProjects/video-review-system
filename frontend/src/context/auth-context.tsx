import { createContext, useContext } from "react"
import { authClient } from "@/lib/auth-client"

type AuthUser = {
  id: string
  name: string
  email: string
  role?: string
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: (session.user as { role?: string }).role,
      }
    : null

  return (
    <AuthContext.Provider value={{ user, isLoading: isPending }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
