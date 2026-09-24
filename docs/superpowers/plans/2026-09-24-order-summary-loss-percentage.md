# Order Summary Loss/Balance Percentage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show balance / processing loss as a percentage of cumulative inward in the Order Summary footer, beside `% OF ORDER QTY`.

**Architecture:** A pure helper `pctOfInward` in `lib/phase.ts` (unit-tested with `node:test`) computes the percentage. The phase detail page renders a two-column footer. The temporary `note` field on `StatGrid` is removed.

**Tech Stack:** Next.js (App Router, server component), Tailwind, `node:test`.

Spec: `docs/superpowers/specs/2026-09-24-order-summary-loss-percentage-design.md`

## Global Constraints

- Labels are exact: `OF ORDER QTY` (left), `LOSS OF INWARD` when `status === "Completed"`, otherwise `BALANCE OF INWARD` (right).
- Right figure: 1 decimal, accent colour (`text-accent-ink`), hidden when inward is 0 or null.
- It must fit at a 375px width without wrapping.

---

### Task 1: Percentage helper + footer

**Files:**
- Modify: `lib/phase.ts` (append `pctOfInward`)
- Test: `tests/phase.test.mjs` (append tests)
- Modify: `app/phase/[id]/page.tsx` (remove local `pctOfInward` + `note`, new footer)
- Modify: `components/design/StatGrid.tsx` (remove `note`)

**Interfaces:**
- Produces: `pctOfInward(part: number | null, inward: number | null): number | null`

- [ ] **Step 1: Write failing tests** (append to `tests/phase.test.mjs`, add `pctOfInward` to the import)

```js
test("pctOfInward returns the share of inward", () => {
  assert.equal(Math.round(pctOfInward(36596.8, 227492.5) * 10) / 10, 16.1);
});

test("pctOfInward treats a null part as zero", () => {
  assert.equal(pctOfInward(null, 100), 0);
});

test("pctOfInward returns null when there is no inward", () => {
  assert.equal(pctOfInward(10, 0), null);
  assert.equal(pctOfInward(10, null), null);
});
```

- [ ] **Step 2: Run and see them fail:** `node --test tests/phase.test.mjs`. Expected: FAIL, `pctOfInward` is not exported.

- [ ] **Step 3: Implement** (append to `lib/phase.ts`)

```ts
// Balance (or processing loss) as a % of cumulative inward; null when nothing
// has come in yet, so callers can hide the figure instead of showing 0% or NaN.
export function pctOfInward(part: number | null, inward: number | null): number | null {
  if (!inward) return null;
  return ((part ?? 0) / inward) * 100;
}
```

- [ ] **Step 4: Run and see them pass:** `node --test tests/phase.test.mjs`. Expected: all pass.

- [ ] **Step 5: Page footer.** In `app/phase/[id]/page.tsx`, delete the local `pctOfInward` function and the `note:` line, import `pctOfInward` from `@/lib/phase`, compute `const lossPct = pctOfInward(phase.balance_mt, phase.cumulative_inward_mt);`, and replace the footer div with:

```tsx
<div className="mt-2.5 grid grid-cols-2 gap-3.5 border-t border-ink pt-2.5">
  <div>
    <div className="font-mono text-2xl font-bold">
      <AnimatedNumber value={Math.round(phase.pct_of_order ?? 0)} decimals={0} suffix="%" />
    </div>
    <div className="font-mono text-[10px] tracking-wide text-muted">OF ORDER QTY</div>
  </div>
  {lossPct !== null && (
    <div>
      <div className="font-mono text-2xl font-bold text-accent-ink">
        <AnimatedNumber value={lossPct} decimals={1} suffix="%" />
      </div>
      <div className="font-mono text-[10px] tracking-wide text-muted">
        {phase.status === "Completed" ? "LOSS OF INWARD" : "BALANCE OF INWARD"}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 6: StatGrid.** Remove the `note?: string` field and its `<span>` render from `components/design/StatGrid.tsx`.

- [ ] **Step 7: Verify.** `npx tsc --noEmit` and `npx eslint app/phase lib/phase.ts components/design/StatGrid.tsx` are clean. At 375px, an ongoing phase shows `BALANCE OF INWARD` and a completed one shows `LOSS OF INWARD`.

- [ ] **Step 8: Commit**

```bash
git add lib/phase.ts tests/phase.test.mjs app/phase/[id]/page.tsx components/design/StatGrid.tsx docs/superpowers/plans/2026-09-24-order-summary-loss-percentage.md
git commit -m "feat(phase): show loss/balance % of inward in order summary footer"
```
