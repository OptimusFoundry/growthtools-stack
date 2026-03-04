# Proto Design System Components

> See [DESIGN-GUIDELINES.md](./DESIGN-GUIDELINES.md) for component APIs, usage patterns, and examples.

## Import Paths

All components are in `src/proto-design-system/components/`:

```tsx
// Primitives
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Avatar } from "@/proto-design-system/components/primitives/Avatar";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Skeleton } from "@/proto-design-system/components/primitives/Skeleton";
import { Tag } from "@/proto-design-system/components/primitives/Tag";

// Forms
import { Input } from "@/proto-design-system/components/forms/Input";
import { TextField } from "@/proto-design-system/components/forms/TextField";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Select } from "@/proto-design-system/components/forms/Select";
import { Checkbox } from "@/proto-design-system/components/forms/Checkbox";
import { Radio } from "@/proto-design-system/components/forms/Radio";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { Slider } from "@/proto-design-system/components/forms/Slider";
import { FormField } from "@/proto-design-system/components/forms/FormField";

// Layout
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Grid } from "@/proto-design-system/components/layout/Grid";
import { Container } from "@/proto-design-system/components/layout/Container";
import { Card, CardHeader, CardBody, CardFooter } from "@/proto-design-system/components/layout/Card";
import { Divider } from "@/proto-design-system/components/layout/Divider";
import { AspectRatio } from "@/proto-design-system/components/layout/AspectRatio";

// Navigation
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/proto-design-system/components/navigation/Tabs";
import { Sidebar } from "@/proto-design-system/components/navigation/Sidebar";
import { Navbar } from "@/proto-design-system/components/navigation/Navbar";
import { Breadcrumb } from "@/proto-design-system/components/navigation/Breadcrumb";
import { Pagination } from "@/proto-design-system/components/navigation/Pagination";
import { StepIndicator } from "@/proto-design-system/components/navigation/StepIndicator";

// Feedback
import { Alert } from "@/proto-design-system/components/feedback/Alert";
import { Toast } from "@/proto-design-system/components/feedback/Toast";
import { Progress } from "@/proto-design-system/components/feedback/Progress";
import { Banner } from "@/proto-design-system/components/feedback/Banner";

// Overlays
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/proto-design-system/components/overlays/Modal";
import { Dropdown } from "@/proto-design-system/components/overlays/Dropdown";
import { DropdownMenu } from "@/proto-design-system/components/overlays/DropdownMenu";
import { Popover } from "@/proto-design-system/components/overlays/Popover";
import { Tooltip } from "@/proto-design-system/components/overlays/Tooltip";

// Data Display
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/proto-design-system/components/data/Table";
import { DataGrid } from "@/proto-design-system/components/data/DataGrid";
import { List } from "@/proto-design-system/components/data/List";
import { StatCard } from "@/proto-design-system/components/data/StatCard";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";

// Composite
import { Accordion } from "@/proto-design-system/components/composite/Accordion";
import { DatePicker } from "@/proto-design-system/components/composite/DatePicker";
import { FileUpload } from "@/proto-design-system/components/composite/FileUpload";
import { MultiSelect } from "@/proto-design-system/components/composite/MultiSelect";
```

## Quick Reference

| Category | Components |
|----------|------------|
| Primitives | Button, Text, Badge, Avatar, Icon, Spinner, Skeleton, Tag |
| Forms | Input, TextField, TextArea, Select, Checkbox, Radio, Switch, Slider, FormField |
| Layout | Stack, Grid, Container, Card, Divider, AspectRatio |
| Navigation | Tabs, Sidebar, Navbar, Breadcrumb, Pagination, StepIndicator |
| Feedback | Alert, Toast, Progress, Banner |
| Overlays | Modal, Dropdown, DropdownMenu, Popover, Tooltip |
| Data | Table, DataGrid, List, StatCard, EmptyState |
| Composite | Accordion, DatePicker, FileUpload, MultiSelect |
