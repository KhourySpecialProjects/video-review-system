/**
 * @description Small count pill shown next to an annotation tab label.
 * Renders nothing when the count is zero so empty tabs stay clean.
 * @param count - Number of entries on the tab
 */
export function TabCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-muted-foreground/15 px-1 text-xs font-medium text-muted-foreground tabular-nums">
      {count}
    </span>
  );
}
