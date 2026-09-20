// components/design/Chip.tsx
type ChipVariant = "default" | "done" | "progress";

export function Chip({
  children,
  variant = "default",
  active = false,
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
  active?: boolean;
}) {
  const variantClass: Record<ChipVariant, string> = {
    default: "border-sage text-muted",
    done: "border-ink bg-ink text-paper",
    progress: "border-accent-ink/50 bg-accent/10 text-accent-ink",
  };
  const classes = active ? "border-ink bg-ink text-paper" : variantClass[variant];

  return (
    <span
      className={`inline-block rounded-control border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${classes}`}
    >
      {children}
    </span>
  );
}
