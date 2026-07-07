import { useState } from "react";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { AdminSidebarNav } from "./AdminSidebarNav";
import { InviteUserDialog } from "./modals/InviteUserDialog";
import { CreateSiteDialog } from "./modals/CreateSiteDialog";
import { CreateStudyDialog } from "./modals/CreateStudyDialog";

/**
 * @description Admin dashboard sidebar. On desktop renders a static
 * in-flow sidebar that scrolls with the page (no fixed positioning, so
 * it coexists with the app navbar and the single page scrollbar) and
 * collapses to zero width when SidebarTrigger toggles the provider's
 * open state. On mobile renders the offcanvas sheet variant instead.
 * Only one variant is mounted at a time — the offcanvas variant renders
 * a viewport-fixed panel plus a width-reserving gap element on desktop,
 * which would break the in-flow layout. Dialog open states for the
 * quick actions are managed here.
 *
 * @param actorRole - The current user's role.
 */
export function AdminSidebar({ actorRole }: { actorRole: string }) {
  const { isMobile, open } = useSidebar();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [createStudyOpen, setCreateStudyOpen] = useState(false);

  const nav = (
    <AdminSidebarNav
      actorRole={actorRole}
      onInvite={() => setInviteOpen(true)}
      onCreateSite={() => setCreateSiteOpen(true)}
      onCreateStudy={() => setCreateStudyOpen(true)}
    />
  );

  return (
    <>
      {isMobile ? (
        <Sidebar collapsible="offcanvas">{nav}</Sidebar>
      ) : (
        // h-auto (not the variant's h-full) so flex-stretch sizes the
        // sidebar to the tallest sibling and its background/border run
        // the full page height. The fixed-width inner wrapper keeps the
        // nav content from reflowing while the width animates closed.
        <Sidebar
          collapsible="none"
          className={cn(
            "h-auto overflow-hidden transition-[width] duration-200 ease-linear",
            open ? "border-r border-sidebar-border" : "w-0",
          )}
        >
          <div className="flex w-(--sidebar-width) flex-1 flex-col">
            {nav}
          </div>
        </Sidebar>
      )}

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        actorRole={actorRole}
      />
      <CreateSiteDialog
        open={createSiteOpen}
        onOpenChange={setCreateSiteOpen}
      />
      <CreateStudyDialog
        open={createStudyOpen}
        onOpenChange={setCreateStudyOpen}
      />
    </>
  );
}
