import { Link } from "react-router";
import {
  Shield,
  LayoutDashboard,
  ClipboardList,
  UserPlus,
  Building2,
  BookOpen,
} from "lucide-react";
import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

/**
 * @description Shared inner content for the admin sidebar: brand header,
 * navigation links, quick-action buttons, and role footer. Rendered by
 * both the static desktop sidebar and the mobile sheet sidebar so the
 * two variants stay identical. The "Create Site" action is only visible
 * to SYSADMIN users.
 *
 * @param actorRole - The current user's role.
 * @param onInvite - Opens the invite-user dialog.
 * @param onCreateSite - Opens the create-site dialog.
 * @param onCreateStudy - Opens the create-study dialog.
 */
export function AdminSidebarNav({
  actorRole,
  onInvite,
  onCreateSite,
  onCreateStudy,
}: {
  actorRole: string;
  onInvite: () => void;
  onCreateSite: () => void;
  onCreateStudy: () => void;
}) {
  return (
    <>
      <SidebarHeader className="flex flex-row items-center gap-2 px-4 py-3">
        <Shield className="size-5 text-primary" />
        <span className="text-sm font-semibold">Admin Panel</span>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/admin" />}>
                <LayoutDashboard className="size-4" />
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link to="/reviews" />}>
                <ClipboardList className="size-4" />
                Reviews
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onInvite}>
                <UserPlus className="size-4" />
                Invite User
              </SidebarMenuButton>
            </SidebarMenuItem>
            {actorRole === "SYSADMIN" && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onCreateSite}>
                  <Building2 className="size-4" />
                  Create Site
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onCreateStudy}>
                <BookOpen className="size-4" />
                Create Study
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {actorRole === "SYSADMIN" ? "System Admin" : "Site Coordinator"}
        </p>
      </SidebarFooter>
    </>
  );
}
