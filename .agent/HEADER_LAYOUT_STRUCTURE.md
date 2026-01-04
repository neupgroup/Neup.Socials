# Header and Layout Structure

## Current Implementation

The application now has **layout-specific headers** that match each sidebar design, rather than a universal header.

## Structure Overview

```
Root Layout (app/layout.tsx)
├── No header - just HTML wrapper
├── Global styles
└── Toaster component

(manage) Layout (app/(manage)/layout.tsx)
├── Header - Management style
├── Sidebar - Management navigation
└── Pages (Dashboard, Analytics, Schedule, etc.)

(inbox) Layout (app/(inbox)/layout.tsx)
├── Header - Inbox style
├── Sidebar - Inbox navigation
└── Nested inbox layout
    ├── Header - Same inbox style (inherited)
    ├── Sidebar - Same inbox sidebar (inherited)
    └── Pages (/inbox, /inbox/[id])
```

## Headers by Layout

### **1. Root Layout** (`app/layout.tsx`)
**No header** - Only provides:
- HTML structure
- Global CSS
- Progress bar
- Toaster

### **2. Management Layout** (`(manage)/layout.tsx`)
**Management Header**:
```tsx
<header>
  <SidebarTrigger /> {/* Mobile menu */}
  <Feedback Button />
  <User Dropdown />
</header>
```

**Features**:
- Feedback button
- User avatar and dropdown
- Profile, Billing, Settings, Log out

**Matches sidebar**: Management navigation (Dashboard, Analytics, etc.)

### **3. Inbox Layout** (`(inbox)/layout.tsx`)
**Inbox Header**:
```tsx
<header>
  <SidebarTrigger /> {/* Mobile menu */}
  <h1>Inbox</h1>
  <Search Bar />
  <Filter Button />
  <User Dropdown />
</header>
```

**Features**:
- "Inbox" title
- Search messages input
- Filter button
- User avatar and dropdown
- Go to Dashboard, Profile, Settings, Log out

**Matches sidebar**: Inbox navigation (Messages, Filters, Channels, Conversations)

### **4. Nested Inbox Layout** (`(inbox)/inbox/layout.tsx`)
**Same as parent** - Inherits the inbox header and sidebar

## Header Customization by Route Group

### **(manage) Header**
```
┌─────────────────────────────────────────────┐
│ [☰]              [Feedback] [👤]            │
└─────────────────────────────────────────────┘
```

**Purpose**: Simple, focused on management tasks
**Actions**: Feedback, User menu

### **(inbox) Header**
```
┌─────────────────────────────────────────────┐
│ [☰] Inbox  [🔍 Search...] [Filter] [👤]    │
└─────────────────────────────────────────────┘
```

**Purpose**: Message-focused with search
**Actions**: Search, Filter, User menu

## Benefits

### 1. **Context-Aware Headers**
Each header matches its sidebar and purpose:
- Management pages: Simple header with feedback
- Inbox pages: Search-focused header

### 2. **No Universal Header**
- Root layout is minimal
- Each route group controls its own header
- Headers can be customized independently

### 3. **Flexibility**
Easy to add different headers for different sections:
- Analytics header: Could add date range picker
- Schedule header: Could add calendar controls
- Inbox header: Has search and filter

### 4. **Consistency Within Sections**
- All management pages have the same header
- All inbox pages have the same header
- Users know what to expect

## Header Components

### **Management Header Components**:
- `SidebarTrigger` - Mobile menu toggle
- `Button` (Feedback) - Submit feedback
- `DropdownMenu` - User menu
- `Avatar` - User profile picture

### **Inbox Header Components**:
- `SidebarTrigger` - Mobile menu toggle
- `h1` - "Inbox" title
- `Input` - Search messages
- `Button` (Filter) - Filter options
- `DropdownMenu` - User menu
- `Avatar` - User profile picture

## Responsive Behavior

### **Desktop**
- Headers show all elements
- Search bar visible in inbox
- Sidebar always visible

### **Mobile**
- `SidebarTrigger` appears
- Search bar hidden on small screens (inbox)
- Sidebar collapsible

## Future Customization Options

### **Per-Page Headers**
Could add page-specific header content:
```tsx
// In schedule/page.tsx
<header>
  <DateRangePicker />
  <ViewToggle /> {/* Month/Week/Day */}
</header>
```

### **Dynamic Headers**
Could change header based on state:
```tsx
// In inbox/[id]/page.tsx
<header>
  <BackButton />
  <ContactName />
  <CallButton />
  <VideoButton />
</header>
```

### **Conditional Elements**
Could show/hide based on context:
```tsx
{isAdmin && <AdminButton />}
{hasNotifications && <NotificationBadge />}
```

## Current Header Hierarchy

```
No Universal Header
    ↓
Route Group Headers
    ├── (manage) Header
    │   └── Used by: /, /analytics, /schedule, /content, etc.
    │
    └── (inbox) Header
        └── Used by: /inbox, /inbox/[id], /inbox/starred, etc.
```

## Status

✅ **Root layout** has no header (minimal wrapper)
✅ **Management layout** has management-specific header
✅ **Inbox layout** has inbox-specific header
✅ **Headers match** their respective sidebars
✅ **Each section** has consistent header styling
✅ **Responsive design** works on all devices

The headers are now **layout-specific** and match the purpose and design of each sidebar! 🎉

## Summary

- **No universal header** - Each route group controls its own
- **Management header** - Simple with feedback button
- **Inbox header** - Search-focused with filter
- **Customizable** - Easy to modify per section
- **Consistent** - Same header within each section

This gives you full control over how each section of your app looks and functions!
