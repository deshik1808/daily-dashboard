# Design — Loss / Balance Percentage in Order Summary

## Goal

Show the Processing Loss (completed) or Balance Qty (ongoing) as a percentage of cumulative inward on every Bio-Mining Phase detail page. It must be impossible to misread the percentage as part of the MT figure, because non-technical superiors read this screen.

## Decision

Keep the percentage out of the stat grid: the grid shows MT only. The percentage goes in the footer row, beside the existing `% OF ORDER QTY`.

## Layout

The Order Summary footer becomes two equal columns:

| Left (unchanged figure) | Right (new) |
|---|---|
| `103%` / `OF ORDER QTY` | `16.1%` (accent colour) / `LOSS OF INWARD` when status is `Completed`, otherwise `BALANCE OF INWARD` |

- Right value = `balance_mt / cumulative_inward_mt × 100`, shown with 1 decimal and animated with `AnimatedNumber` like the left figure.
- When `cumulative_inward_mt` is 0 or null, the right column is not rendered and the footer looks the way it does today.
- Both figures use the same size, which fits two columns at 375px width without wrapping.

## Code changes

- `app/phase/[id]/page.tsx`: replace the footer row with the two-column layout. Remove the `note` passed to the balance stat.
- `components/design/StatGrid.tsx`: remove the `note` field added earlier the same day (no longer used).
- No database or data-layer changes. `balance_mt` and `cumulative_inward_mt` already come from `getPhaseById`.

## Verification

- `tsc --noEmit` passes.
- At 375px width: an ongoing phase shows `BALANCE OF INWARD` with the correct percentage, a completed phase shows `LOSS OF INWARD`, and a phase with zero inward shows only the left column.
