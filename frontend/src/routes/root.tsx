import { Outlet } from "react-router"

export default function Root() {
  return (
    <main className="min-h-screen p-8">
      <Outlet />
    </main>
  )
}