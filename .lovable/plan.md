# Persistent data layer — inspection findings and plan

No visual changes: the plan touches only data storage and the code that reads/writes it. Pages, colors, layout and navigation stay exactly as they are.

## What exists today

**Pages (11):** Landing (`/`), Auth, Dashboard, Design Upload, My Designs, Critique Results, Browse Designers, Designer Evaluation, Recruiter Dashboard, Profile, Not Found.

**Upload workflow:** Design Upload accepts either a local image (stored in the public `designs` storage bucket) or a pasted portfolio link with a platform dropdown (Behance / Dribbble / Figma / ArtStation / Other). It saves a row in `designs`, runs the analysis, then saves one row in `ai_critiques`.

**Authentication:** Email + password and Google sign-in, with a role picked before signup (Designer or Recruiter). Role is stored in `user_roles`; a matching row goes into `profiles`. The chosen role for Google sign-in is briefly held in the browser (`pending_role`).

**Analysis workflow:** The `analyze-design` backend function calls the AI model and returns a score plus 7 categories, each with one strength and one improvement written as a paragraph. Re-analyzing inserts a new critique row, so history is kept per design.

**Database (already live):** `profiles`, `designs`, `ai_critiques`, `recruiter_evaluations`, `user_roles`, plus `has_role` / `get_user_role` helpers, updated-at triggers, row-level security on every table, and 5 migration files.

**Where results live now:** critiques are saved in `ai_critiques` (scores, strengths, improvements, quick wins, full feedback). Recruiter ratings/notes/status live in `recruiter_evaluations`.

**Gaps found**
1. The landing-page quick analysis (used by the upload box on `/`) is never saved — results disappear on refresh.
2. The chosen platform and the pasted portfolio link are sent to the AI but not stored on the design.
3. Multi-design comparison results are stored nowhere — there is no comparison feature or table at all.
4. Recruiter evaluation is one row per designer; per-design feedback cannot be saved separately.
5. Designs are not tied to `profiles` by a relation, so listings need extra round trips.
6. Storage bucket `designs` is public, and deleting a design leaves its image file behind.

## Plan

**1. Extend `designs` (additive, nullable)**
`source_type` (file / url), `source_platform`, `source_url`, `storage_path` (to clean up files on delete).

**2. Extend `ai_critiques`**
`version` number and `model` label so the history timeline can label runs precisely; keep existing columns untouched.

**3. New table: `design_comparisons`**
Owner, title, list of design ids, AI comparison output, created date — with access limited to the owner. Gives multi-design comparison a permanent home.

**4. New table: `design_evaluations`**
Per-design recruiter feedback (rating, notes, status) alongside the existing per-designer table, so recruiters can comment on individual designs.

**5. New table: `analysis_sessions`**
Saves guest/landing-page analyses for a signed-in user so nothing is lost on refresh; linked to a design once one is created.

**6. Access rules and permissions**
Every new table gets row-level security plus the grants the app needs: designers manage their own rows, recruiters read what they are allowed to evaluate.

**7. Cleanup helpers**
Foreign keys from `designs` to `profiles`; a trigger to keep `updated_at` fresh on new tables; delete the stored image file when a design is removed.

**8. Code wiring (no UI redesign)**
- Save platform / link / storage path on upload.
- Refresh generated types after the schema change.
- Persist landing-page analyses for signed-in users.
- Point My Designs delete at the storage cleanup.
- Add read/write helpers for comparisons and per-design evaluations, ready for the comparison screen when you want it.

## Technical notes
All schema work goes through additive migrations (new nullable columns, new tables with GRANTs + RLS + policies) — no drops, renames or type changes, so the live app keeps working during the change. Generated database types are regenerated afterwards so the app compiles against the new schema.
