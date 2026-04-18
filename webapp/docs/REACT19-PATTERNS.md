# React 19 Patterns

APIs to use, deprecated patterns to avoid, and testing patterns for React 19.

---

## New APIs — Use These

### ref as prop (no forwardRef)

```tsx
// ✅ React 19
export interface InputProps {
  ref?: Ref<HTMLInputElement>;
}
export function Input({ ref, ...props }: InputProps) {
  return <input ref={ref} {...props} />;
}

// ❌ Deprecated — remove forwardRef
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));
```

### useActionState for forms (renamed from useFormState)

```tsx
// ✅ React 19
import { useActionState } from 'react';

const [state, formAction, isPending] = useActionState(
  async (_prevState, formData: FormData) => {
    return await submitForm(formData);
  },
  null
);

// ❌ Deprecated
import { useFormState } from 'react-dom'; // renamed, do not use
```

### useFormStatus for submit state

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
}
```

### useOptimistic for optimistic UI

```tsx
import { useOptimistic } from 'react';

const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (state, newItem: Item) => [...state, { ...newItem, pending: true }]
);
```

### use() for reading promises and context

```tsx
import { use, Suspense } from 'react';

// Read a promise inside render (must be wrapped in Suspense)
function Content({ promise }: { promise: Promise<Data> }) {
  const data = use(promise); // suspends until resolved
  return <div>{data.value}</div>;
}

// Read context — can be called conditionally (unlike useContext)
function Component({ show }: { show: boolean }) {
  if (!show) return null;
  const theme = use(ThemeContext); // OK to call inside condition
  return <div className={theme} />;
}
```

### Context directly (no .Provider)

```tsx
// ✅ React 19
<ThemeContext value={{ theme, setTheme }}>
  {children}
</ThemeContext>

// ❌ Deprecated
<ThemeContext.Provider value={{ theme, setTheme }}>
  {children}
</ThemeContext.Provider>
```

### Ref cleanup functions

```tsx
// ✅ React 19 — return cleanup from ref callback
<div ref={(el) => {
  if (el) {
    const observer = new IntersectionObserver(handler);
    observer.observe(el);
    return () => observer.disconnect(); // cleanup
  }
}}>
```

---

## Deprecated Patterns — Remove These

| Old | New |
|-----|-----|
| `forwardRef((props, ref) => ...)` | `ref` as regular prop |
| `<Context.Provider value={...}>` | `<Context value={...}>` |
| `useFormState` from `react-dom` | `useActionState` from `react` |
| `useMemo` / `useCallback` for performance | React Compiler handles it automatically |
| Implicit ref callback: `ref={el => (instance = el)}` | Explicit block: `ref={el => { instance = el }}` |

---

## React Compiler

React Compiler (enabled in this project) automatically memoizes components and values. **Do not add manual `useMemo` or `useCallback` for performance reasons** — it's redundant and adds noise. Only use them when the semantics require it (e.g., stable callback reference for a `useEffect` dep).

---

## Testing Patterns (React 19)

### Testing forms with useActionState

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('form submission with useActionState', async () => {
  const user = userEvent.setup();
  const mockSubmit = vi.fn().mockResolvedValue({ success: true });

  render(<FormComponent onSubmit={mockSubmit} />);

  await user.type(screen.getByRole('textbox'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith(expect.any(FormData));
  });
});
```

### Testing optimistic updates

```tsx
test('shows optimistic item before server responds', async () => {
  const user = userEvent.setup();
  const slowAdd = vi.fn(() => new Promise(r => setTimeout(r, 100)));

  render(<OptimisticList items={[]} onAdd={slowAdd} />);

  await user.type(screen.getByRole('textbox'), 'New Item');
  await user.click(screen.getByRole('button'));

  // Item appears immediately before server confirms
  expect(screen.getByText('New Item')).toBeInTheDocument();

  await waitFor(() => expect(slowAdd).toHaveBeenCalled());
});
```

### Testing use() with Suspense

```tsx
test('renders data from promise', async () => {
  const dataPromise = Promise.resolve({ content: 'Hello' });

  render(
    <Suspense fallback={<div>Loading...</div>}>
      <DataComponent dataPromise={dataPromise} />
    </Suspense>
  );

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing context (no .Provider)

```tsx
test('component uses context correctly', () => {
  render(
    // React 19: Use <Context> directly as wrapper
    <ThemeContext value={{ theme: 'dark', toggle: vi.fn() }}>
      <ThemedComponent />
    </ThemeContext>
  );

  expect(screen.getByTestId('themed')).toHaveClass('dark');
});
```

### Testing ref as prop

```tsx
test('forwards ref correctly', () => {
  const ref = { current: null };

  render(<MyInput ref={ref} placeholder="test" />);

  expect(ref.current).toBeInstanceOf(HTMLInputElement);
});
```

---

## Common Migration Issues

```tsx
// OLD → NEW

// Context.Provider (breaks in strict React 19)
<ThemeContext.Provider value={mock}>  →  <ThemeContext value={mock}>

// forwardRef (works but deprecated)
const ref = createRef(); render(<MyComponent ref={ref} />);
// same code works, but component itself should drop forwardRef wrapper

// useFormState (renamed)
import { useFormState } from 'react-dom';  →  import { useActionState } from 'react';

// TypeScript 5.9 — ArrayBuffer type mismatch
const buf = typedArray.buffer as ArrayBuffer;
```
