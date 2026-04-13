/**
 * checks whether an error is a Prisma "record not found" error (P2025)
 *
 * @param error - the caught error to check
 * 
 * @returns true if the error has code P2025
 */
export function isPrismaNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as any).code === "P2025"
  );
}