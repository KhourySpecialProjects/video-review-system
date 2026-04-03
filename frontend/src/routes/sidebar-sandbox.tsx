import { AnnotationSidebar } from "../features/sidebar/sidebar";

export default function SidebarSandbox() {
  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white">
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">Sidebar Sandbox</h1>
        <p className="text-zinc-400">
          This is the main content area. The annotation sidebar should be visible
          on the right.
        </p>
      </div>
      <AnnotationSidebar />
    </div>
  );
}
