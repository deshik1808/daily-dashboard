# Design — Bio-Mining Project Notes & Processing Loss

2026-09-20 · Approved by Deshik

## Scope

This change adds one durable, editable current note to every Bio-Mining project card on the Home screen and renames the Phase detail `BALANCE` label to `PROCESSING LOSS`.

The existing MRF card, entry data, totals view, and balance calculation remain unchanged. `PROCESSING LOSS` is a presentation-only label; it continues to show the computed value `cumulative inward − cumulative disposed`.

## Data model and access

Add `current_note text not null default ''` and `note_updated_at timestamptz` to `phase_master`.

There is deliberately no separate notes table: the requested scope is one current value per Phase/Agency, not a dated note history. The existing RLS policies already allow all users to read `phase_master` and authenticated Editors to update it. Note writes use the authenticated server-side Supabase client and update only these note fields for the selected project.

## Home interaction

Every Bio-Mining `Window` card receives a compact `NOTE` area below its existing summary. If a note exists, it is visible to both Viewers and Editors. Empty notes do not render an empty value to Viewers.

Authenticated Editors see `ADD NOTE` for empty notes or `EDIT NOTE` for saved notes. The control is outside the card's phase-detail link, so it remains independently tappable. Selecting it reveals an inline, labelled textarea with `SAVE` and `CANCEL` controls. Saving trims surrounding whitespace, rejects a blank note, shows an inline failure message when the update cannot be saved, and refreshes the card after success. The controls retain the existing 1-bit styling and meet the mobile touch-target and keyboard-focus requirements.

## Phase detail

The Order Summary stat grid label changes from `BALANCE` to `PROCESSING LOSS` in every Bio-Mining Phase detail route. The orange accent and numeric value are preserved.

## Verification

Automated coverage will prove note normalization and validation before implementation. Afterward, run lint, TypeScript/production build, and browser checks as anonymous Viewer and authenticated Editor:

- viewer sees a saved note but no note control;
- editor can add and then replace a note on each Bio-Mining card;
- save failure leaves entered text visible with an actionable error;
- each Phase detail page renders `PROCESSING LOSS` and its original numeric value.
