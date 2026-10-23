# scripts/

Utilities for refactoring and checks.

All scripts are pure ASCII - no encoding issues in PowerShell 5.1 or 7+.

## Apply order

1. `refactor-imports.ps1 -DryRun` - preview changes
2. `refactor-imports.ps1` - apply (creates backup)
3. `check-all.ps1` - full check
4. `audit-complexity.ps1` - remaining warnings
5. `enable-strict-index.ps1` - enable noUncheckedIndexedAccess, collect report

## Scripts

| Script | Purpose |
|---|---|
| `refactor-imports.ps1` | `from '../../shared/X'` -> `from '@/shared/X'` |
| `enable-strict-index.ps1` | enable strict flag, produce `tsc-strict-index-report.txt` |
| `audit-complexity.ps1` | list files with complexity > 15 and max-params > 4 |
| `check-all.ps1` | typecheck + typecheck:test + eslint + depcruise + vitest |