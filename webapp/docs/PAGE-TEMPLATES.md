# Page Templates

Concrete skeletons for the four page shapes this app uses. Each template
is drop-in — copy it into a new route file, rename the strings, wire in
your data hooks. Every skeleton assumes `PATTERNS.md` (adjacent file in
this directory) for spacing / heading / empty-state conventions.

Four shapes:
1. **List page** — a collection of items (Posts, Media, Blog, Calendar)
2. **Detail page** — a single item with breadcrumb + tabs (Campaign detail, Post detail)
3. **Form page** — a long vertical form (Create Post, Voice Profile settings)
4. **Tabbed settings page** — tabs that swap content in place (Account)

Shared boilerplate: every route uses `<Stack gap="lg" className={styles.page} animate>`
as its shell. The `.page` class lives in a `.module.scss` sibling with
`padding: var(--space-5)`.

---

## 1. List page

A header row with title + action button, optional filters, a list or grid
below, `EmptyState` when empty.

```tsx
// routes/posts.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus, SearchX } from "lucide-react";
import { useState } from "react";
import { useGetPosts } from "@/hooks/useGetPosts";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./page.module.scss";

export const Route = createFileRoute("/posts")({ component: PostsPage });

function PostsPage() {
  const [filter, setFilter] = useState("");
  const { posts, loading } = useGetPosts({ filter });
  const hasFilter = filter !== "";

  return (
    <Stack gap="lg" className={styles.page} animate>
      {/* Header */}
      <Stack direction="row" justify="between" align="start" wrap>
        <Stack gap="xs">
          <Text as="h1" size="2xl" weight="bold">
            Posts
          </Text>
          <Text color="muted">
            Create, manage, and publish your social media posts
          </Text>
        </Stack>
        <Link to="/posts/new">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            Create Post
          </Button>
        </Link>
      </Stack>

      {/* Filters (optional) */}
      <Stack direction="row" gap="sm">
        {/* <Dropdown items={...} value={filter} onChange={setFilter} /> */}
      </Stack>

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : posts.length === 0 && hasFilter ? (
        <EmptyState
          icon={<SearchX size={48} />}
          title="No matching posts"
          description="Try adjusting your filters."
          action={
            <Button variant="secondary" onClick={() => setFilter("")}>
              Clear filters
            </Button>
          }
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No posts yet"
          description="Create your first post to get started."
          action={
            <Link to="/posts/new">
              <Button variant="primary" leftIcon={<Plus size={16} />}>
                Create Post
              </Button>
            </Link>
          }
        />
      ) : (
        <Stack gap="xs">
          {posts.map((post) => (/* card per item */))}
        </Stack>
      )}
    </Stack>
  );
}
```

```scss
// routes/page.module.scss (shared)
.page {
  padding: var(--space-5);
}
```

**Key choices:**
- Title weight is always `bold`, subtitle color always `muted`.
- Two EmptyState branches: filtered-empty (with "Clear" secondary action) vs truly-empty (with primary create action).
- List gap: `gap="xs"` for tight stacks of cards, `gap="sm"` for roomy ones.
- Action button goes inside the row Stack, not outside the header.

---

## 2. Detail page (breadcrumb + tabs)

Top-of-page breadcrumb back to the list, optional status badge, then tabs
or sub-navigation, then the selected content.

```tsx
// routes/posts/$id.tsx
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { PenSquare } from "lucide-react";
import { useGetPostDetails } from "@/hooks/useGetPostDetails";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./page.module.scss";

export const Route = createFileRoute("/posts/$id")({ component: PostDetail });

function PostDetail() {
  const { id } = useParams({ from: "/posts/$id" });
  const { post, loading } = useGetPostDetails(id);

  if (loading) return <Spinner />;
  if (!post) return null;

  return (
    <Stack gap="lg" className={styles.page} animate>
      {/* Breadcrumb row (optional badge inline) */}
      <Stack direction="row" gap="sm" align="center">
        <Breadcrumb
          size="lg"
          items={[
            { label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
            { label: post.title },
          ]}
        />
        <Badge variant="success">{post.status}</Badge>
      </Stack>

      <Divider />

      {/* Sub-nav if route-driven; otherwise render detail content directly */}
      {/* <PostTabNav postId={id} /> */}
      <Outlet />
    </Stack>
  );
}
```

**Key choices:**
- Breadcrumb `size="lg"` on detail pages (default `"md"` elsewhere).
- `<Divider />` after the breadcrumb when tabs or nav follow.
- Status badges sit *inside* the breadcrumb row, not in their own line.

---

## 3. Form page

A constrained-width vertical form. Sections separated by `<Divider />`,
each section is a titled group of fields, Save button at the bottom right.

```tsx
// features/account/VoiceProfileTab.tsx (or similar)
import { Check } from "lucide-react";
import { type ReactNode, useState } from "react";
import { FormField } from "@/proto-design-system/components/forms/FormField";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./form.module.scss";

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text as="h3" size="lg" weight="semibold">
          {title}
        </Text>
        {description && (
          <Text size="sm" color="secondary">
            {description}
          </Text>
        )}
      </Stack>
      {children}
    </Stack>
  );
}

export function VoiceProfileTab() {
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <Stack gap="xl" className={styles.form}>
      {/* Optional page header if this is a standalone page */}
      <Stack gap="xs">
        <Text as="h2" size="xl">
          Voice Profile
        </Text>
        <Text size="md" color="secondary">
          Configure your AI writing tone and personality
        </Text>
      </Stack>

      <Section
        title="Audience"
        description="Help AI tailor content to your industry"
      >
        <TextField
          label="Industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          isFullWidth
        />
      </Section>

      <Divider />

      <Section title="Examples">
        <TextArea
          label="Example posts"
          rows={4}
          fullWidth
          helperText="One per line"
        />
      </Section>

      <Divider />

      <Stack direction="row" gap="sm" justify="end">
        <Button variant="ghost">Cancel</Button>
        <Button
          variant="primary"
          isLoading={saving}
          leftIcon={<Check size={16} />}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  );
}
```

```scss
// form.module.scss
.form {
  max-width: 800px;
}
```

**Key choices:**
- Outer form is `Stack gap="xl"` so sections breathe.
- Each `Section` uses `Stack gap="md"` internally (fields close together, descriptions attached).
- `<Divider />` between sections is mandatory.
- `TextField` / `TextArea` / `Dropdown` wrapped in `<FormField label>` for consistent labels.
- **Width cap lives on the form itself**, not on a `<Container>`. `max-width: 800px` or `var(--max-width-2xl)`.
- Save row at the bottom: `Stack direction="row" gap="sm" justify="end"`, Cancel (ghost) then Save (primary).

---

## 4. Tabbed settings page

Tabs that swap content in-place. Use when all tabs live at the same URL
and don't need their own routes.

```tsx
// features/account/AccountPage.tsx
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CreditCard, Mic, Share2 } from "lucide-react";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from "@/proto-design-system/components/navigation/Tabs";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { BillingTab } from "./BillingTab";
import styles from "./account.module.scss";

const VALID_TABS = ["billing", "voice-profile", "platforms"] as const;

export function AccountPage() {
  const search = useSearch({ from: "/account" });
  const navigate = useNavigate();
  const activeTab =
    VALID_TABS.includes(search.tab as (typeof VALID_TABS)[number])
      ? search.tab!
      : "billing";

  return (
    <Stack gap="lg" className={styles.page} animate>
      <Stack gap="xs">
        <Text as="h1" size="2xl" weight="bold">
          Settings
        </Text>
        <Text color="muted">Manage your account settings and billing</Text>
      </Stack>

      <Tabs
        activeTab={activeTab}
        onTabChange={(id) =>
          navigate({
            to: "/account",
            search: id === "billing" ? {} : { tab: id },
            replace: true,
          })
        }
        variant="line"
      >
        <TabList aria-label="Settings tabs">
          <Tab id="billing" icon={<CreditCard size={16} />}>Billing</Tab>
          <Tab id="voice-profile" icon={<Mic size={16} />}>Voice Profile</Tab>
          <Tab id="platforms" icon={<Share2 size={16} />}>Platforms</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="billing"><BillingTab /></TabPanel>
          <TabPanel id="voice-profile">{/* ... */}</TabPanel>
          <TabPanel id="platforms">{/* ... */}</TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
```

**Key choices:**
- `variant="line"` for the Tabs (matches the rest of the app).
- Tab state synced to `?tab=` query param so deep links work.
- Tab content is rendered bare (no Card wrapper). If the tab IS a form, the form's own `max-width` kicks in.
- Default tab (`billing` here) should clear the query param, not set `?tab=billing`.

---

## When to use which shape

| Page looks like | Template |
|---|---|
| Collection of items + "Create X" button | List |
| One item's full view with nav | Detail |
| Fill out fields and Save | Form |
| "Settings" that splits into categories | Tabbed |

Many real pages compose these. A Detail page can embed a Form below the
tabs. A Tabbed page can put a List on one tab and a Form on another.

Every composition still uses the same `Stack gap="lg" className={styles.page} animate`
outer shell and the same `bold / muted` title rhythm — those are invariant.
