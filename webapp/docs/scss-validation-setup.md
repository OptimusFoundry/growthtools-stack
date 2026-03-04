# SCSS Design Token Validation

This project includes automatic validation of SCSS design tokens to ensure all variables used in component files are actually defined in the design token files.

## Options

We have two validation approaches:

### **Option 1: Stylelint (Integrated Linting) ✅ RECOMMENDED**

Stylelint provides real-time validation in your editor and during builds.

#### Setup

```bash
# Install stylelint and SCSS support
npm install --save-dev stylelint stylelint-config-standard-scss stylelint-scss stylelint-config-recess-order
```

#### Run Validation

```bash
# Check all SCSS files
npm run lint:scss

# Auto-fix issues (where possible)
npm run lint:scss:fix
```

#### Features

- ✅ Real-time validation in VS Code (with stylelint extension)
- ✅ Validates token usage during development
- ✅ Catches invalid tokens: `font-size-2xl` → suggests `font-size-h1`
- ✅ Integrates with CI/CD pipelines
- ✅ Can auto-fix some issues
- ✅ Shows errors inline in your editor

#### Configuration

- **Config file**: `.stylelintrc.json`
- **Custom plugin**: `scripts/stylelint-plugin-validate-tokens.js`

The custom plugin checks:
- All `module.$variable` references (e.g., `typography.$font-size-md`)
- Validates against actual design token definitions
- Provides helpful error messages with suggestions
- Catches common mistakes (font-size-2xl, border-radius-full, etc.)

---

### **Option 2: Standalone Script (Manual Validation)**

A Node.js script for one-off validation checks.

#### Setup

```bash
# Install glob for file matching
npm install --save-dev glob
```

#### Run Validation

```bash
# Run validation script
npm run validate:tokens
```

#### Features

- ✅ Fast and simple
- ✅ No editor integration needed
- ✅ Colored terminal output
- ✅ Detailed error reports
- ❌ No real-time feedback
- ❌ Manual execution required

#### Configuration

- **Script file**: `scripts/validate-scss-tokens.js`

---

## Comparison

| Feature | Stylelint | Standalone Script |
|---------|-----------|-------------------|
| Real-time validation | ✅ Yes | ❌ No |
| Editor integration | ✅ Yes | ❌ No |
| Auto-fix | ✅ Yes | ❌ No |
| CI/CD integration | ✅ Easy | ✅ Easy |
| Setup complexity | Medium | Simple |
| Performance | Fast | Very Fast |

## Recommendation

**Use Stylelint** for the best developer experience. It provides:
- Immediate feedback while coding
- Integration with VS Code
- Prevents errors before commit
- Standard tooling that works with other linters

The standalone script is useful for:
- Quick validation without setup
- CI environments where stylelint isn't installed
- Debugging token issues

---

## Common Invalid Tokens

The validation catches these common mistakes:

```scss
// ❌ WRONG - These tokens don't exist
typography.$font-size-2xl
typography.$font-size-3xl
typography.$font-size-4xl
typography.$font-size-5xl
typography.$font-weight-normal
border.$border-radius-full

// ✅ CORRECT - Use these instead
typography.$font-size-h2  // 32px
typography.$font-size-h3  // 28px
typography.$font-size-h4  // 24px
typography.$font-size-h1  // 40px
typography.$font-weight-regular  // 500
border.$border-radius-round  // 999px
```

---

## VS Code Setup (Recommended)

1. Install the **Stylelint** extension:
   - Search for "stylelint" in VS Code extensions
   - Install "Stylelint" by Stylelint

2. Add to `.vscode/settings.json`:

```json
{
  "stylelint.enable": true,
  "stylelint.validate": ["css", "scss"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": true
  },
  "css.validate": false,
  "scss.validate": false
}
```

3. Reload VS Code

Now you'll see real-time validation errors in SCSS files!

---

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Lint SCSS
  run: npm run lint:scss
```

```yaml
# GitLab CI example
lint:scss:
  script:
    - npm run lint:scss
```

---

## Troubleshooting

### Stylelint not working in VS Code

1. Check that the extension is installed
2. Reload VS Code window
3. Check output panel for stylelint errors
4. Verify `.stylelintrc.json` exists

### False positives

If a token is reported as invalid but exists:
1. Clear the token cache by restarting stylelint
2. Check the token file path in `scripts/stylelint-plugin-validate-tokens.js`
3. Verify the token is exported (has `$variable: value;` syntax)

### Performance issues

Stylelint can be slow on large projects:
1. Add more paths to `.stylelintrc.json` `ignoreFiles`
2. Use the standalone script for quick checks
3. Run stylelint only on changed files in CI

---

## Supported Design Token Modules

The validation checks these modules:

- `typography` - Font sizes, weights, line heights, letter spacing
- `layout` - Spacing tokens (spacing-01 through spacing-13)
- `border` - Border widths and radii
- `motion` - Animation durations and easings
- `breakpoints` - Responsive breakpoints
- `colors` - Color scales and theme variables

For complete token reference, see [docs/design-tokens.md](./design-tokens.md)
