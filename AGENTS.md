## Rules that apply everywhere

- **MUST** and **MUST NOT** mark real invariants - layer boundaries, wire
  contracts, output shapes - not house style.
- UI edits are the ones the eye can check: markup, styles, layout and copy MUST
  NOT be gated on test cases. Logic the eye cannot check - validation, data
  flow, state transitions - carries tests as usual.
- Before committing, `pnpm run ci` MUST pass.
- Commit messages follow Conventional Commits.
