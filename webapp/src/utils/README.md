# Utils Directory

This directory contains utility functions and data transformers for the application.

## Data Transformers

We follow a consistent pattern for transforming API responses (snake_case) to TypeScript objects (camelCase).

### Why Data Transformers?

The backend API returns data in snake_case format (Python convention), but TypeScript/JavaScript uses camelCase. We use DTO (Data Transfer Object) transformers to convert between these formats.

### Available Transformers

#### User Data Transformers (`userDataTransform.ts`)
- `transformApiUserToWaitlistUser(user)` - Transforms a single user
- `transformApiUsersToWaitlistUsers(users[])` - Transforms an array of users

**Usage:**
```typescript
import { transformApiUsersToWaitlistUsers } from "@/utils/userDataTransform";

const response = await fetcher(url);
const transformedUsers = transformApiUsersToWaitlistUsers(response.users);
```

#### Campaign Data Transformers (`campaignDataTransform.ts`)
- `transformApiCampaignToCampaign(campaign)` - Transforms a single campaign
- `transformApiCampaignsToCampaigns(campaigns[])` - Transforms an array of campaigns

**Usage:**
```typescript
import { transformApiCampaignToCampaign } from "@/utils/campaignDataTransform";

const response = await fetcher(url);
const campaign = transformApiCampaignToCampaign(response);
```

#### Generic Transformers (`transformers.ts`)
Reusable utilities for any data transformation:

- `snakeToCamel(str)` - Converts string from snake_case to camelCase
- `camelToSnake(str)` - Converts string from camelCase to snake_case
- `objectKeysToCamel(obj)` - Recursively converts all object keys to camelCase
- `objectKeysToSnake(obj)` - Recursively converts all object keys to snake_case
- `parseDate(dateString)` - Safely parses date strings
- `formatDateToISO(date)` - Formats dates to ISO strings

**Usage:**
```typescript
import { objectKeysToCamel } from "@/utils/transformers";

const apiResponse = { user_name: "John", created_at: "2024-01-01" };
const camelCased = objectKeysToCamel(apiResponse);
// Result: { userName: "John", createdAt: "2024-01-01" }
```

### When to Use Transformers

**Always use transformers when:**
1. Receiving data from API endpoints
2. The API response uses snake_case
3. Your TypeScript types use camelCase

**Where to use transformers:**
- In custom hooks (useGetCampaign, useGetCampaignUsers, etc.)
- Right after fetching data from the API
- Before setting state with the data

### Best Practices

1. **Transform at the boundary** - Transform data as soon as it enters your application (in hooks)
2. **Type the transformers** - Always provide proper TypeScript types
3. **Document field mappings** - Note any complex transformations in comments
4. **Handle nulls/undefined** - Use safe parsing for optional fields
5. **Parse dates** - Always convert date strings to Date objects

### Example: Creating a New Transformer

```typescript
// 1. Define the API response type (snake_case)
interface ApiProductResponse {
  product_id: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

// 2. Define the UI type (camelCase) in types/
export interface Product {
  productId: string;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
}

// 3. Create the transformer
export function transformApiProduct(apiProduct: ApiProductResponse): Product {
  return {
    productId: apiProduct.product_id,
    productName: apiProduct.product_name,
    createdAt: new Date(apiProduct.created_at),
    updatedAt: new Date(apiProduct.updated_at),
  };
}

// 4. Use in hook
export const useGetProduct = (id: string) => {
  // ... hook setup
  const response = await fetcher<ApiProductResponse>(url);
  const product = transformApiProduct(response);
  setData(product);
};
```

## Other Utilities

### CSV Export (`csvExport.ts`)
- `exportUsersToCSV(users, campaignName)` - Exports user data to CSV file

## Type Consistency Guidelines

### Current State
- **WaitlistUser**: Uses camelCase (recommended ✅)
- **Campaign**: Uses snake_case (matches API, but should migrate to camelCase)

### Migration Plan
When we standardize everything to camelCase:
1. Update Campaign type to use camelCase fields
2. Use `transformApiCampaignToCampaign()` in all campaign hooks
3. Update all components using Campaign to expect camelCase

### Adding New Types
For all new types:
- Use camelCase for TypeScript interfaces
- Create transformers for API responses
- Document any special field mappings
