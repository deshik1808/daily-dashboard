// lib/phase-codes.ts
// Deterministic short codes for phase pages: /p/1z, /p/2z, /p/3c, /p/3z
// Code = arabic phase number + lowercase first letter of agency.

const ROMAN: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4", V: "5" };

export function phaseToCode(phase: string, agency: string): string {
  const num = ROMAN[phase] ?? phase;
  return `${num}${agency[0].toLowerCase()}`;
}
