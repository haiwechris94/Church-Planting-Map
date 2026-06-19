# Design System Quick Reference

## 🎨 Color Quick Reference

### When to use each color:

**Primary (Teal - #0d9fc1)**
- Main CTAs and primary actions
- Active navigation items
- Primary interactive elements
- Links and focus states

**Secondary (Green - #00853e)**
- Success messages and confirmations
- Growth/progress indicators
- Positive status badges
- Secondary CTAs

**Accent (Orange - #f58021)**
- Featured content highlights
- Special promotions or announcements
- Important but not critical actions
- Attention-grabbing elements

**Danger (Red - #de1c24)**
- Error messages
- Delete/destructive actions
- Critical warnings
- Failed status indicators

**Warning (Amber - #f59e0b)**
- Caution messages
- Pending/in-progress states
- Important notices
- Validation warnings

**Neutral (Grays)**
- Body text (neutral-600 to neutral-800)
- Borders and dividers (neutral-200 to neutral-300)
- Backgrounds (neutral-50 to neutral-100)
- Disabled states (neutral-400)

---

## 🔘 Button Quick Guide

```jsx
import Button from '@/components/ui/Button';

// Primary action
<Button variant="primary">Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Success action
<Button variant="success">Approve</Button>

// Danger action
<Button variant="danger">Delete</Button>

// With icons
<Button variant="primary" leftIcon={<Save size={16} />}>
  Save
</Button>

// Loading state
<Button variant="primary" loading>
  Processing...
</Button>

// Sizes
<Button variant="primary" size="sm">Small</Button>
<Button variant="primary" size="lg">Large</Button>
```

---

## 🏷️ Badge Quick Guide

```jsx
import { Badge } from '@/components/ui';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Failed</Badge>
<Badge variant="primary">New</Badge>
<Badge variant="neutral">Draft</Badge>
```

---

## 📋 Card Quick Guide

```jsx
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>

// Hover effect
<Card hover>
  Content
</Card>

// Interactive (clickable)
<Card interactive onClick={handleClick}>
  Content
</Card>
```

---

## 📑 Tab Quick Guide

```jsx
import { TabContainer, Tab } from '@/components/ui';

// Pill tabs (default)
<TabContainer variant="pill">
  <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
    Overview
  </Tab>
  <Tab active={activeTab === 'details'} onClick={() => setActiveTab('details')}>
    Details
  </Tab>
</TabContainer>

// Underline tabs
<TabContainer variant="underline">
  <Tab variant="underline" active={activeTab === 'all'}>
    All Items
  </Tab>
  <Tab variant="underline" active={activeTab === 'active'}>
    Active
  </Tab>
</TabContainer>
```

---

## 🔍 Filter Chip Quick Guide

```jsx
import { FilterChip } from '@/components/ui';

// Basic filter
<FilterChip active={isActive} onClick={handleClick}>
  Filter Name
</FilterChip>

// Removable filter
<FilterChip 
  active 
  removable 
  onRemove={handleRemove}
>
  Active Filter
</FilterChip>

// With icon
<FilterChip icon={<Filter size={14} />}>
  Filter
</FilterChip>
```

---

## 🔄 Toggle Switch Quick Guide

```jsx
import { ToggleSwitch } from '@/components/ui';

<ToggleSwitch 
  checked={isEnabled} 
  onChange={setIsEnabled}
  label="Enable feature"
/>
```

---

## 📝 Input Quick Guide

```jsx
import { Input } from '@/components/ui';

// Basic input
<Input 
  label="Email Address"
  type="email"
  placeholder="Enter your email"
/>

// With icons
<Input 
  label="Search"
  leftIcon={<Search size={16} />}
  placeholder="Search..."
/>

// With error
<Input 
  label="Password"
  type="password"
  error="Password is required"
/>

// With helper text
<Input 
  label="Username"
  helper="Choose a unique username"
/>
```

---

## 🗺️ Layer Panel Quick Guide

```jsx
import { LayerPanel, LayerItem } from '@/components/ui';
import { Layers } from 'lucide-react';

<LayerPanel title="Map Layers" icon={<Layers size={16} />}>
  <LayerItem active icon={<Check size={16} />}>
    Active Layer
  </LayerItem>
  <LayerItem icon={<Circle size={16} />}>
    Inactive Layer
  </LayerItem>
</LayerPanel>
```

---

## 🎭 Animation Classes

```jsx
// Fade in from top
<div className="animate-fade-in">Content</div>

// Slide in from left
<div className="animate-slide-in">Content</div>

// Slide up from bottom
<div className="animate-slide-up">Content</div>

// Scale in
<div className="animate-scale-in">Content</div>
```

---

## 📐 Spacing Utilities

Use Tailwind's spacing scale (multiples of 4px):

```jsx
// Padding
<div className="p-4">     // 16px all sides
<div className="px-6">    // 24px horizontal
<div className="py-3">    // 12px vertical

// Margin
<div className="m-4">     // 16px all sides
<div className="mx-auto">  // Center horizontally
<div className="mt-6">    // 24px top

// Gap (for flex/grid)
<div className="flex gap-4">  // 16px gap between items
<div className="grid gap-6">  // 24px gap between items
```

---

## 🎨 Common Patterns

### Status Indicator
```jsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 rounded-full bg-success-500" />
  <span className="text-sm text-neutral-600">Active</span>
</div>
```

### Info Card with Icon
```jsx
<Card>
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
      <Info size={20} className="text-primary-600" />
    </div>
    <div>
      <h4 className="font-semibold text-neutral-800">Title</h4>
      <p className="text-sm text-neutral-600">Description</p>
    </div>
  </div>
</Card>
```

### Action Menu
```jsx
<div className="flex items-center gap-2">
  <Button variant="ghost" size="icon">
    <Edit size={16} />
  </Button>
  <Button variant="ghost" size="icon">
    <Trash2 size={16} className="text-danger-600" />
  </Button>
</div>
```

### Loading State
```jsx
<div className="flex items-center justify-center p-8">
  <Loader2 size={32} className="animate-spin text-primary-500" />
</div>
```

### Empty State
```jsx
<div className="text-center p-12">
  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
    <Inbox size={32} className="text-neutral-400" />
  </div>
  <h3 className="text-lg font-semibold text-neutral-800 mb-2">No items found</h3>
  <p className="text-neutral-600 mb-4">Get started by creating your first item</p>
  <Button variant="primary">Create Item</Button>
</div>
```

---

## 🚀 Best Practices

1. **Consistency**: Use the same variant for similar actions across the app
2. **Hierarchy**: Primary > Secondary > Ghost for visual importance
3. **Spacing**: Use consistent spacing (4px increments)
4. **Colors**: Limit to 2-3 colors per screen
5. **Feedback**: Always provide visual feedback for interactions
6. **Accessibility**: Ensure proper contrast and focus states
7. **Loading**: Show loading states for async operations
8. **Errors**: Display clear, actionable error messages

---

## 📱 Responsive Utilities

```jsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block md:hidden">Mobile only</div>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">Responsive padding</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

---

## 🔗 Resources

- Full Design System: `frontend/DESIGN_SYSTEM.md`
- UI Components: `frontend/src/components/ui/`
- Tailwind Config: `frontend/tailwind.config.js`
- Global Styles: `frontend/src/index.css`
