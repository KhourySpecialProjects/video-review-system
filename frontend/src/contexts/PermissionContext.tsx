import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { PermissionLevel } from "@shared/permissions";

/** @description Numeric rank for each permission level, higher = more access. */
const LEVEL_RANK: Record<PermissionLevel, number> = {
  READ: 0,
  WRITE: 1,
  EXPORT: 2,
  ADMIN: 3,
};

type PermissionContextValue = {
  level: PermissionLevel;
  /** @description True if user has at least READ permission. */
  canRead: boolean;
  /** @description True if user has at least WRITE permission. */
  canWrite: boolean;
  /** @description True if user has ADMIN permission. */
  canAdmin: boolean;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

/**
 * @description Provides the user's permission level and derived access flags
 * to the component tree via context.
 * @param level - The resolved permission level from the loader
 * @param children - Child components
 */
export function PermissionProvider({
  level,
  children,
}: {
  level: PermissionLevel;
  children: ReactNode;
}) {
  const value = useMemo<PermissionContextValue>(() => {
    const rank = LEVEL_RANK[level];
    return {
      level,
      canRead: rank >= LEVEL_RANK.READ,
      canWrite: rank >= LEVEL_RANK.WRITE,
      canAdmin: rank >= LEVEL_RANK.ADMIN,
    };
  }, [level]);

  return (
    <PermissionContext value={value}>
      {children}
    </PermissionContext>
  );
}

/**
 * @description Returns the current user's permission level and derived access flags.
 * @returns Permission context with level, canRead, canWrite, canAdmin
 * @throws If used outside of a PermissionProvider
 */
export function usePermission(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return ctx;
}
