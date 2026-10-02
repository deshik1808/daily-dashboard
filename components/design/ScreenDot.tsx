// components/design/ScreenDot.tsx
// Round, softly graded marker for the Red / Yellow screens. Colors are muted
// to sit with the sage + bronze theme instead of pure signal red/yellow.
const GRADIENTS = {
  red: "radial-gradient(circle at 35% 30%, #d98a7e 0%, #b9574b 60%, #9a4339 100%)",
  yellow: "radial-gradient(circle at 35% 30%, #ecd08a 0%, #d3a84f 60%, #b88a35 100%)",
} as const;

export function ScreenDot({
  screen,
  size = "md",
}: {
  screen: keyof typeof GRADIENTS;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"}`}
      style={{ backgroundImage: GRADIENTS[screen] }}
      aria-hidden
    />
  );
}
