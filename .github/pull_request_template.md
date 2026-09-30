## Description
Briefly describe the purpose of this PR and what changes were made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Performance / Refactor (code improvement without functional change)
- [ ] Documentation update

## Invariant Checklist
- [ ] Audio lifecycle is strictly preserved in `AudioManager.tsx` (no new `<audio>` elements).
- [ ] Pure CSS variables used for theming (`var(--bg-base)`, `var(--panel-bg)`, etc.). No hardcoded dark colors.
- [ ] Tested with Node.js native test runner (`pnpm --filter web test`).
- [ ] ESLint passed cleanly with 0 errors/warnings (`pnpm --filter web lint`).
- [ ] Production build succeeds (`pnpm --filter web build`).

## Related Issues / Specs
Closes #
