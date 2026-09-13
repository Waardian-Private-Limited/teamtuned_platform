# Feature folders

Every feature owns one folder under `src/features/`, split by responsibility so
a file's job is obvious from its path. `login` is the reference implementation —
copy its shape.

```
src/features/<feature>/
├── api/          HTTP calls. Endpoints + DTOs only. No React, no state, no routing.
├── dto/          Wire shapes, named exactly as the backend sends them.
├── model/        Domain types the UI speaks, plus the mapper DTO → model.
├── constants/    Enums, routes, storage keys, timings.
├── hooks/        State and behaviour. Owns no markup.
└── ui/           Components. Renders what the hooks expose, decides nothing.
    ├── components/   Reusable pieces within the feature.
    └── steps/        One file per screen in a multi-step flow.
```

## Rules

1. **Dependencies point one way**: `ui → hooks → api → dto`, with `model` used by
   hooks and ui. Nothing in `api/` imports React; nothing in `ui/` calls `fetch`.
2. **DTOs never reach the UI.** A backend rename should only touch `dto/` and the
   mapper in `model/`. If a component reads `societyId`, the boundary leaked.
3. **`lib/apiClient` is transport only** — request building, auth header, error
   normalisation. Endpoint functions belong in a feature's `api/`.
4. **Styling comes from `src/theme/tokens.ts`.** Colors, radii and shadows are CSS
   variables in `src/app/globals.css`; component recipes (button, heading, field,
   alert) live in `tokens.ts`. Do not hand-roll Tailwind color classes in a page.
5. **Comment the block, not the line.** One line saying why a block exists, above
   any non-obvious function, effect or branch.
6. **`app/<route>/page.tsx` is a shell.** It composes layout and one feature
   component; the logic lives in the feature folder.

## Responsive baseline

Pages must survive 360px → 1920px with no horizontal scroll. Mobile-first
classes, `md:` for the tablet/desktop split, `min-h-[100dvh]` rather than
`min-h-screen`, and `env(safe-area-inset-*)` padding at the page edges.
