# Design Tokens

> See [DESIGN-GUIDELINES.md](./DESIGN-GUIDELINES.md) for complete token values and usage patterns.

## Token Files

**Location:** `src/proto-design-system/tokens/`

| File | Prefix | Example |
|------|--------|---------|
| `_spacing.scss` | `--space-*` | `var(--space-4)` |
| `_colors.scss` | `--color-*` | `var(--color-primary)` |
| `_typography.scss` | `--font-*` | `var(--font-size-lg)` |
| `_shadows.scss` | `--shadow-*` | `var(--shadow-md)` |
| `_radius.scss` | `--radius-*` | `var(--radius-lg)` |
| `_z-index.scss` | `--z-*` | `var(--z-modal)` |
| `_motion.scss` | `--duration-*`, `--ease-*` | `var(--duration-fast)` |

## Quick Example

```scss
// ✅ Always use tokens
.card {
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

// ❌ Never hardcode
.card {
  padding: 16px;
  border-radius: 8px;
  background: #ffffff;
}
```
