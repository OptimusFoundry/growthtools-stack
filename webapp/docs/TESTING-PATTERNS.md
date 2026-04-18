# Frontend Testing Patterns

Testing strategy, patterns, and commands for the React frontend.

---

## Testing Stack

- **Vitest** — unit and component tests
- **React Testing Library** — component rendering and queries
- **userEvent** — realistic user interaction simulation
- **MSW** — API mocking at the network level (used in E2E via `@msw/playwright`)
- **Playwright** — E2E tests in `e2e/`

---

## Commands

```bash
npm run test                                        # Run all unit/component tests
npm run test -- --watch                             # Watch mode
npm run test -- --testPathPattern="<pattern>"       # Run specific test file
npm run test -- -u                                  # Update snapshots
npm run build                                       # Catches TypeScript errors
npm run lint                                        # Biome linter
```

---

## What to Test Where

| Scenario | Test type | Location |
|----------|-----------|----------|
| Component rendering, props, states | Unit (Vitest + RTL) | `src/**/*.test.tsx` |
| Hook logic, state transitions | Unit (Vitest) | `src/**/*.test.ts` |
| Full user flows, API integration | E2E (Playwright + MSW) | `e2e/*.spec.ts` |

---

## Unit Test Patterns

### Basic component test

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  it('renders with default props', () => {
    render(<ComponentName label="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ComponentName label="Test" onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: /test/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows error message on validation failure', async () => {
    const user = userEvent.setup();
    render(<FormComponent onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
});
```

### Async loading states

```tsx
it('shows loading spinner then data', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ items: [{ id: 1, name: 'Item' }] });
  vi.mock('@/api', () => ({ fetcher: mockFetch }));

  render(<ItemList />);

  // Loading state
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  // Data state
  await screen.findByText('Item');
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
```

### Mocking API calls

```tsx
import { vi } from 'vitest';

// At top of test file
vi.mock('@/api', () => ({
  fetcher: vi.fn(),
}));

// In specific test
import { fetcher } from '@/api';
vi.mocked(fetcher).mockResolvedValue({ data: 'test' });
```

### Async queries

```tsx
// WRONG: sync query for async content
const result = screen.getByText('Loaded');

// CORRECT: findBy* for async content
const result = await screen.findByText('Loaded');

// CORRECT: waitFor for state changes
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

---

## E2E Test Structure

E2E tests live in `e2e/` and use Playwright with MSW for network mocking.

```
e2e/
├── *.spec.ts           # Test files (one per feature/domain)
├── fixtures/
│   └── test.ts         # Extended Playwright test with network fixture
├── handlers/
│   ├── index.ts        # Aggregates all handlers
│   └── *.handlers.ts   # Domain-specific MSW handlers
└── mocks/
    └── data/
        └── index.ts    # Mock data (snake_case for API format)
```

### MSW handler template

```typescript
// e2e/handlers/items.handlers.ts
import { http, HttpResponse } from 'msw';
import { mockItems } from '../mocks/data';

export const itemHandlers = [
  http.get('/api/protected/items', () => {
    return HttpResponse.json(mockItems);
  }),
  http.post('/api/protected/items', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-id', ...body }, { status: 201 });
  }),
  http.delete('/api/protected/items/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### E2E test template

```typescript
// e2e/items.spec.ts
import { test, expect } from './fixtures/test';

test.describe('Items feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/items');
  });

  test('displays list of items', async ({ page }) => {
    await expect(page.getByText('Item Name')).toBeVisible();
  });

  test('creates a new item', async ({ page, network }) => {
    network.use(
      http.post('/api/protected/items', () =>
        HttpResponse.json({ id: '1', name: 'New Item' }, { status: 201 })
      )
    );
    await page.getByRole('button', { name: /create/i }).click();
    await page.getByLabel('Name').fill('New Item');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('New Item')).toBeVisible();
  });

  test('shows empty state when no items', async ({ page, network }) => {
    network.use(
      http.get('/api/protected/items', () => HttpResponse.json([]))
    );
    await page.reload();
    await expect(page.getByText(/no items found/i)).toBeVisible();
  });
});
```

---

## React 19 Testing Specifics

See `webapp/docs/REACT19-PATTERNS.md` for:
- Testing `useActionState` forms
- Testing optimistic updates
- Testing `use()` with Suspense
- Testing context (no `.Provider`)
- Testing ref as prop

---

## Rules

1. Use `userEvent.setup()` — not `fireEvent` — for realistic interaction
2. Use `findBy*` for async content, `getBy*` for sync
3. Mock at the API level (`vi.mock('@/api')`) not at the component level
4. Test behavior, not implementation — query by role/label, not CSS class
5. No `// @ts-ignore` — fix type issues properly
6. Never delete a failing test without understanding why it fails
