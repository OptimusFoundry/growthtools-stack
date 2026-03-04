# Proto Design System - AI Agent Guidelines

This document provides guidelines for AI agents to create consistent, accessible, and visually polished SaaS pages using the Proto Design System.

> **IMPORTANT: Do not recreate components that already exist in the design system.**
> Before building any UI element, check the [Components Reference](#components-reference) section.
> The design system includes 50+ production-ready components covering buttons, forms, layouts, navigation, data display, and more.
> Always import and use existing components rather than creating custom implementations.

> **STYLING RULES:**
> - **Never hardcode values in SCSS** - Always use design tokens (`var(--space-4)`, not `16px`)
> - **Avoid the `style` prop** - Use SCSS modules and component props/variants instead
> - **Use component variants** - Prefer `variant="primary"` over custom styling
> - **SCSS handles layout** - Use SCSS for positioning, sizing, and custom layouts

---

## Table of Contents

1. [Styling Best Practices](#styling-best-practices)
2. [Design Tokens](#design-tokens)
3. [Typography](#typography)
4. [Spacing](#spacing)
5. [Colors](#colors)
6. [Components Reference](#components-reference)
7. [Layout Patterns](#layout-patterns)
8. [Common SaaS Pages](#common-saas-pages)
9. [Accessibility Requirements](#accessibility-requirements)
10. [Do's and Don'ts](#dos-and-donts)

---

## Styling Best Practices

### Use Design Tokens, Never Hardcode

```scss
// ✅ CORRECT - Using tokens
.card {
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

// ❌ WRONG - Hardcoded values
.card {
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  background: #ffffff;
}
```

### Use SCSS Modules, Not Style Props

```tsx
// ✅ CORRECT - SCSS module
import styles from './MyComponent.module.scss';

<div className={styles.container}>
  <Card className={styles.customCard}>
    <Button variant="primary">Submit</Button>
  </Card>
</div>

// ❌ WRONG - Inline styles
<div style={{ display: 'flex', gap: '16px', padding: '24px' }}>
  <Card style={{ marginTop: '20px' }}>
    <Button style={{ backgroundColor: 'blue' }}>Submit</Button>
  </Card>
</div>
```

### Use Component Props/Variants, Not Custom CSS

```tsx
// ✅ CORRECT - Using component props
<Button variant="primary" size="lg">Large Primary</Button>
<Button variant="ghost">Cancel</Button>
<Badge variant="success">Active</Badge>
<Text size="lg" weight="semibold" color="secondary">Subtitle</Text>

// ❌ WRONG - Overriding with custom styles
<Button className={styles.bigBlueButton}>Submit</Button>
<span className={styles.customBadge}>Active</span>
```

### When SCSS is Appropriate

Use SCSS modules for:
- **Page layouts** - Grid structures, positioning
- **Custom compositions** - Arranging multiple components
- **Responsive adjustments** - Media query overrides
- **Animation/transitions** - Custom animations

```scss
// ✅ CORRECT - Layout with tokens
.pageLayout {
  display: grid;
  grid-template-columns: var(--space-64) 1fr;
  gap: var(--space-6);
  padding: var(--space-page);
}

.sidebar {
  position: sticky;
  top: var(--space-4);
  height: fit-content;
}

@media (max-width: 768px) {
  .pageLayout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
```

### Style Prop - Only When Absolutely Necessary

The `style` prop should only be used for:
- **Dynamic values** calculated at runtime (e.g., progress width)
- **CSS custom properties** passed from JavaScript

```tsx
// ✅ ACCEPTABLE - Dynamic runtime value
<div style={{ '--progress-width': `${percentage}%` } as React.CSSProperties}>

// ✅ ACCEPTABLE - Truly dynamic positioning
<div style={{ transform: `translateX(${offset}px)` }}>

// ❌ WRONG - Static layout (use SCSS instead)
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
```

---

## Design Tokens

Always use design tokens instead of hardcoded values. This ensures consistency and theme support.

**Token files location:** `src/design-system/tokens/`

| Category | File | Prefix | Example |
|----------|------|--------|---------|
| Spacing | `_spacing.scss` | `--space-*` | `var(--space-4)` |
| Colors | `_colors.scss` | `--color-*` | `var(--color-primary)` |
| Typography | `_typography.scss` | `--font-*` | `var(--font-size-lg)` |
| Shadows | `_shadows.scss` | `--shadow-*` | `var(--shadow-md)` |
| Radius | `_radius.scss` | `--radius-*` | `var(--radius-lg)` |
| Z-index | `_z-index.scss` | `--z-*` | `var(--z-modal)` |
| Breakpoints | `_breakpoints.scss` | `--breakpoint-*` | `768px` |
| Motion | `_motion.scss` | `--duration-*`, `--ease-*` | `var(--duration-fast)` |

> **Reference the token files directly** for available values. The token files contain all spacing scales, color palettes, font sizes, and other design values.

---

## Typography

Reference `src/design-system/tokens/_typography.scss` for all font sizes and weights.

### Typography Component

```tsx
// Headings
<Text as="h1" size="3xl" weight="semibold">Page Title</Text>
<Text as="h2" size="2xl" weight="semibold">Section Header</Text>
<Text as="h3" size="xl" weight="medium">Card Title</Text>

// Body text
<Text size="base">Regular paragraph text</Text>
<Text size="sm" color="secondary">Secondary/helper text</Text>
<Text size="xs" color="tertiary">Metadata, timestamps</Text>
```

---

## Spacing

Based on an 8px grid system. Reference `src/design-system/tokens/_spacing.scss` for all spacing values.

### Stack Component for Spacing

```tsx
// Vertical stack with gap
<Stack gap={4}>
  <Component1 />
  <Component2 />
</Stack>

// Horizontal stack
<Stack direction="horizontal" gap={2}>
  <Button>Save</Button>
  <Button variant="ghost">Cancel</Button>
</Stack>
```

---

## Colors

Reference `src/design-system/tokens/_colors.scss` for all color tokens.

### Color Usage Rules

1. **Never use hex colors** - Always use tokens
2. **Primary for CTAs** - Main actions use `--color-primary`
3. **Ghost for secondary** - Less important actions use ghost variant
4. **Error for destructive** - Delete, remove actions use error color
5. **Success for positive** - Completed, saved states use success

---

## Components Reference

### Primitives (Base building blocks)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Button` | Actions, CTAs | `variant`, `size`, `disabled` |
| `Text` | Typography | `as`, `size`, `weight`, `color` |
| `Badge` | Status indicators | `variant`, `size` |
| `Avatar` | User images | `src`, `name`, `size` |
| `Icon` | Icons wrapper | `size`, `color` |
| `Spinner` | Loading states | `size` |
| `Skeleton` | Loading placeholders | `variant` |
| `Tag` | Labels, categories | `variant`, `removable` |

### Forms

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Input` | Text input | `size`, `variant`, `disabled` |
| `TextField` | Input with label | `label`, `helperText`, `errorMessage` |
| `TextArea` | Multi-line input | `rows`, `resize` |
| `Select` | Dropdown select | `options`, `placeholder` |
| `Checkbox` | Boolean toggle | `label`, `checked` |
| `Radio` | Single select | `label`, `name`, `value` |
| `Switch` | On/off toggle | `label`, `checked` |
| `Slider` | Range input | `min`, `max`, `step` |
| `FormField` | Field wrapper | `label`, `error`, `required` |

### Layout

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Stack` | Flex layout | `direction`, `gap`, `align` |
| `Grid` | Grid layout | `columns`, `gap` |
| `Container` | Max-width wrapper | `size` |
| `Card` | Content container | `variant`, `padding` |
| `Divider` | Visual separator | `orientation` |
| `AspectRatio` | Fixed aspect container | `ratio` |

### Navigation

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Tabs` | Tab navigation | `defaultTab`, `variant` |
| `Sidebar` | App navigation | `collapsed`, `responsive` |
| `Navbar` | Top navigation | `sticky` |
| `Breadcrumb` | Path navigation | `items` |
| `Pagination` | Page navigation | `page`, `totalPages` |
| `StepIndicator` | Multi-step progress | `currentStep`, `steps` |

### Feedback

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Alert` | Inline messages | `variant`, `title` |
| `Toast` | Temporary notifications | `variant`, `duration` |
| `Progress` | Progress indication | `value`, `max` |
| `Banner` | Page-level messages | `variant`, `dismissible` |

### Overlays

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Modal` | Dialog windows | `open`, `onClose`, `size` |
| `Dropdown` | Select menus | `items`, `value` |
| `DropdownMenu` | Action menus | `items`, `trigger` |
| `Popover` | Contextual content | `trigger`, `placement` |
| `Tooltip` | Hover hints | `content`, `placement` |

### Data Display

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Table` | Data tables | `columns`, `data` |
| `DataGrid` | Advanced tables | `columns`, `data`, `sortable` |
| `List` | List layouts | `items` |
| `StatCard` | Metric display | `title`, `value`, `trend` |
| `EmptyState` | No data states | `title`, `description`, `action` |

### Composite

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Accordion` | Collapsible sections | `items`, `multiple` |
| `DatePicker` | Date selection | `value`, `onChange` |
| `FileUpload` | File input | `accept`, `multiple` |
| `MultiSelect` | Multi-choice select | `items`, `value` |

---

## Layout Patterns

### Page Structure

```tsx
// Standard page layout
<div className="page">
  <Sidebar responsive>
    {/* Navigation */}
  </Sidebar>

  <main className="main-content">
    <Navbar>
      {/* Top bar */}
    </Navbar>

    <Container>
      <Stack gap={8}>
        {/* Page header */}
        <Stack gap={2}>
          <Text as="h1" size="3xl" weight="semibold">Page Title</Text>
          <Text color="secondary">Page description goes here</Text>
        </Stack>

        {/* Page content */}
        <Card>
          {/* Content */}
        </Card>
      </Stack>
    </Container>
  </main>
</div>
```

### Card Layout

```tsx
<Card>
  <CardHeader>
    <Stack direction="horizontal" justify="between" align="center">
      <Text as="h3" size="xl" weight="medium">Card Title</Text>
      <Button variant="ghost" size="sm">Action</Button>
    </Stack>
  </CardHeader>
  <CardBody>
    {/* Card content */}
  </CardBody>
  <CardFooter>
    <Stack direction="horizontal" gap={2} justify="end">
      <Button variant="ghost">Cancel</Button>
      <Button>Save</Button>
    </Stack>
  </CardFooter>
</Card>
```

### Form Layout

```tsx
<Card>
  <CardBody>
    <Stack gap={6}>
      <Text as="h2" size="xl" weight="semibold">Form Title</Text>

      <Grid columns={2} gap={4}>
        <TextField label="First Name" required />
        <TextField label="Last Name" required />
      </Grid>

      <TextField label="Email" type="email" required />

      <TextArea label="Description" rows={4} />

      <Stack direction="horizontal" gap={2} justify="end">
        <Button variant="ghost">Cancel</Button>
        <Button>Submit</Button>
      </Stack>
    </Stack>
  </CardBody>
</Card>
```

### Grid Layouts

```tsx
// 3-column card grid
<Grid columns={{ default: 1, md: 2, lg: 3 }} gap={6}>
  <StatCard title="Users" value="12,345" trend={+12} />
  <StatCard title="Revenue" value="$45,678" trend={+8} />
  <StatCard title="Orders" value="1,234" trend={-3} />
</Grid>

// 2-column settings layout
<Grid columns={{ default: 1, lg: 2 }} gap={8}>
  <Card>{/* Left column */}</Card>
  <Card>{/* Right column */}</Card>
</Grid>
```

---

## Common SaaS Pages

### Dashboard Page

```tsx
<Container>
  <Stack gap={8}>
    {/* Header */}
    <Stack direction="horizontal" justify="between" align="center">
      <Stack gap={1}>
        <Text as="h1" size="3xl" weight="semibold">Dashboard</Text>
        <Text color="secondary">Welcome back, here's your overview</Text>
      </Stack>
      <Button>New Report</Button>
    </Stack>

    {/* Stats Row */}
    <Grid columns={{ default: 1, sm: 2, lg: 4 }} gap={4}>
      <StatCard title="Total Users" value="12,345" trend={+12.5} />
      <StatCard title="Revenue" value="$45,678" trend={+8.2} />
      <StatCard title="Active Sessions" value="1,234" />
      <StatCard title="Conversion" value="3.2%" trend={-0.4} />
    </Grid>

    {/* Main Content */}
    <Grid columns={{ default: 1, lg: 3 }} gap={6}>
      <Card className="lg:col-span-2">
        <CardHeader>
          <Text size="lg" weight="medium">Analytics</Text>
        </CardHeader>
        <CardBody>
          {/* Chart component */}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Text size="lg" weight="medium">Recent Activity</Text>
        </CardHeader>
        <CardBody>
          <List>
            {/* Activity items */}
          </List>
        </CardBody>
      </Card>
    </Grid>
  </Stack>
</Container>
```

### Settings Page

```tsx
<Container size="md">
  <Stack gap={8}>
    {/* Header */}
    <Stack gap={1}>
      <Text as="h1" size="3xl" weight="semibold">Settings</Text>
      <Text color="secondary">Manage your account preferences</Text>
    </Stack>

    {/* Settings Sections */}
    <Tabs defaultTab="profile">
      <TabList>
        <Tab id="profile">Profile</Tab>
        <Tab id="account">Account</Tab>
        <Tab id="notifications">Notifications</Tab>
        <Tab id="billing">Billing</Tab>
      </TabList>

      <TabPanels>
        <TabPanel id="profile">
          <Card>
            <CardBody>
              <Stack gap={6}>
                <Stack direction="horizontal" gap={4} align="center">
                  <Avatar size="lg" name="John Doe" />
                  <Button variant="outline" size="sm">Change Photo</Button>
                </Stack>

                <Divider />

                <Grid columns={2} gap={4}>
                  <TextField label="First Name" defaultValue="John" />
                  <TextField label="Last Name" defaultValue="Doe" />
                </Grid>

                <TextField label="Email" defaultValue="john@example.com" />
                <TextArea label="Bio" rows={3} />

                <Stack direction="horizontal" justify="end">
                  <Button>Save Changes</Button>
                </Stack>
              </Stack>
            </CardBody>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Stack>
</Container>
```

### Table/List Page

```tsx
<Container>
  <Stack gap={6}>
    {/* Header with actions */}
    <Stack direction="horizontal" justify="between" align="center">
      <Stack gap={1}>
        <Text as="h1" size="3xl" weight="semibold">Users</Text>
        <Text color="secondary">Manage your team members</Text>
      </Stack>
      <Button icon={<Plus />}>Add User</Button>
    </Stack>

    {/* Filters */}
    <Card>
      <CardBody>
        <Stack direction="horizontal" gap={4}>
          <TextField placeholder="Search users..." icon={<Search />} />
          <Select
            placeholder="Role"
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'user', label: 'User' },
            ]}
          />
          <Select
            placeholder="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Stack>
      </CardBody>
    </Card>

    {/* Table */}
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <Stack direction="horizontal" gap={3} align="center">
                <Avatar size="sm" name="John Doe" />
                <Text weight="medium">John Doe</Text>
              </Stack>
            </TableCell>
            <TableCell>john@example.com</TableCell>
            <TableCell><Badge>Admin</Badge></TableCell>
            <TableCell><Badge variant="success">Active</Badge></TableCell>
            <TableCell>
              <DropdownMenu
                trigger={<Button variant="ghost" size="sm" icon={<MoreVertical />} />}
                items={[
                  { id: 'edit', label: 'Edit' },
                  { id: 'delete', label: 'Delete', danger: true },
                ]}
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    {/* Pagination */}
    <Stack direction="horizontal" justify="center">
      <Pagination page={1} totalPages={10} onPageChange={() => {}} />
    </Stack>
  </Stack>
</Container>
```

### Empty State

```tsx
<Container>
  <Card>
    <CardBody>
      <EmptyState
        icon={<Inbox />}
        title="No messages yet"
        description="When you receive messages, they'll appear here"
        action={
          <Button>Compose Message</Button>
        }
      />
    </CardBody>
  </Card>
</Container>
```

### Modal Dialog

```tsx
<Modal open={isOpen} onClose={() => setIsOpen(false)} size="md">
  <ModalHeader>
    <Text size="xl" weight="semibold">Edit User</Text>
  </ModalHeader>
  <ModalBody>
    <Stack gap={4}>
      <TextField label="Name" defaultValue="John Doe" />
      <TextField label="Email" defaultValue="john@example.com" />
      <Select
        label="Role"
        options={[
          { value: 'admin', label: 'Admin' },
          { value: 'user', label: 'User' },
        ]}
      />
    </Stack>
  </ModalBody>
  <ModalFooter>
    <Stack direction="horizontal" gap={2} justify="end">
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button>Save</Button>
    </Stack>
  </ModalFooter>
</Modal>
```

---

## Accessibility Requirements

### Keyboard Navigation

1. **All interactive elements** must be focusable via Tab
2. **Focus indicators** must be visible (handled by design system)
3. **Arrow keys** for navigating within components (tabs, dropdowns, etc.)
4. **Escape** to close overlays (modals, dropdowns)
5. **Enter/Space** to activate buttons and toggles

### ARIA Labels

```tsx
// Always provide aria-label for icon-only buttons
<Button icon={<X />} aria-label="Close" />

// Use aria-describedby for error messages
<TextField
  label="Email"
  errorMessage="Invalid email"
  aria-describedby="email-error"
/>

// Provide context for screen readers
<nav aria-label="Main navigation">
  <Sidebar>...</Sidebar>
</nav>
```

### Color Contrast

- Text on backgrounds must meet WCAG 2.1 AA standards
- The design system tokens are pre-configured for proper contrast
- Don't override colors with non-token values

### Focus Management

```tsx
// Trap focus in modals
<Modal open={isOpen} onClose={handleClose}>
  {/* Focus is automatically trapped */}
</Modal>

// Return focus after closing
const triggerRef = useRef();
<Button ref={triggerRef} onClick={() => setIsOpen(true)}>Open</Button>
<Modal
  open={isOpen}
  onClose={() => {
    setIsOpen(false);
    triggerRef.current?.focus(); // Return focus
  }}
>
```

---

## Do's and Don'ts

### Do's

1. **Use semantic HTML** - `<button>` for actions, `<a>` for links
2. **Use design tokens** - Never hardcode colors, spacing, or sizes
3. **Provide feedback** - Show loading states, success/error messages
4. **Keep forms simple** - Only ask for necessary information
5. **Use consistent patterns** - Same actions should look the same
6. **Group related items** - Use cards and sections to organize
7. **Provide empty states** - Guide users when there's no data
8. **Use appropriate variants** - Primary for main CTA, ghost for secondary

### Don'ts

1. **Don't recreate existing components** - Always use design system components instead of building custom ones. Check the [Components Reference](#components-reference) first.
2. **Don't use multiple primary buttons** - Only one main CTA per view
3. **Don't hide critical actions** - Important actions should be visible
4. **Don't use color alone** - Combine with icons/text for accessibility
5. **Don't overcrowd** - Use whitespace generously
6. **Don't nest cards unnecessarily** - Keep hierarchy flat
7. **Don't use modals for simple confirmations** - Use inline alerts
8. **Don't disable without explanation** - Show why something is disabled
9. **Don't use placeholder as label** - Labels should be visible

### Button Hierarchy

```tsx
// Primary - Main action (one per view)
<Button>Save Changes</Button>

// Secondary - Important but not primary
<Button variant="secondary">Export</Button>

// Outline - Neutral actions
<Button variant="outline">Preview</Button>

// Ghost - Tertiary, subtle actions
<Button variant="ghost">Cancel</Button>

// Destructive - Delete, remove actions
<Button variant="destructive">Delete</Button>
```

### Form Validation

```tsx
// Show errors inline, not in alerts
<TextField
  label="Email"
  value={email}
  onChange={setEmail}
  errorMessage={errors.email}
  required
/>

// Use helper text for guidance
<TextField
  label="Password"
  type="password"
  helperText="Must be at least 8 characters"
/>

// Group related fields
<FormField label="Address" required>
  <Stack gap={3}>
    <TextField placeholder="Street" />
    <Grid columns={3} gap={3}>
      <TextField placeholder="City" />
      <TextField placeholder="State" />
      <TextField placeholder="ZIP" />
    </Grid>
  </Stack>
</FormField>
```

---

*Last updated: December 2024*
