# Church Planting Map - Design System

## Overview
This design system is based on the brand colors extracted from the EVERYWHERE and New Generations logos, creating a modern, soft, and classy aesthetic for the Church Planting Map application.

---

## Color Palette

### Primary Colors (Teal/Cyan)
Extracted from the EVERYWHERE logo mark - represents trust, clarity, and global reach.

```css
primary-50:  #e8f7fb  /* Lightest teal - backgrounds */
primary-100: #c7edf5  /* Light teal - hover states */
primary-200: #a3e2ef  /* Soft teal */
primary-300: #7dd7e9  /* Medium-light teal */
primary-400: #5dcee4  /* Medium teal */
primary-500: #0d9fc1  /* Main brand teal - primary actions */
primary-600: #0b8aa9  /* Dark teal - hover states */
primary-700: #097591  /* Darker teal */
primary-800: #076079  /* Very dark teal */
primary-900: #054b61  /* Deepest teal */
```

### Secondary Colors (Green)
Extracted from the New Generations logo - represents growth, life, and mission.

```css
secondary-50:  #e6f7f0  /* Lightest green */
secondary-100: #c2ead9  /* Light green */
secondary-200: #9dddc2  /* Soft green */
secondary-300: #78d0ab  /* Medium-light green */
secondary-400: #53c394  /* Medium green */
secondary-500: #00853e  /* Main brand green */
secondary-600: #007336  /* Dark green */
secondary-700: #00612e  /* Darker green */
secondary-800: #004f26  /* Very dark green */
secondary-900: #003d1e  /* Deepest green */
```

### Accent Colors (Orange)
Extracted from the New Generations logo - represents energy, warmth, and action.

```css
accent-50:  #fef4e8  /* Lightest orange */
accent-100: #fde4c2  /* Light orange */
accent-200: #fcd49c  /* Soft orange */
accent-300: #fbc476  /* Medium-light orange */
accent-400: #fab450  /* Medium orange */
accent-500: #f58021  /* Main brand orange */
accent-600: #d96f1c  /* Dark orange */
accent-700: #bd5e17  /* Darker orange */
accent-800: #a14d12  /* Very dark orange */
accent-900: #853c0d  /* Deepest orange */
```

### Danger Colors (Red)
Extracted from the New Generations logo - represents alerts and critical actions.

```css
danger-50:  #fce8e9  /* Lightest red */
danger-100: #f7c2c4  /* Light red */
danger-200: #f29c9f  /* Soft red */
danger-300: #ed767a  /* Medium-light red */
danger-400: #e85055  /* Medium red */
danger-500: #de1c24  /* Main brand red */
danger-600: #c2181f  /* Dark red */
danger-700: #a6141a  /* Darker red */
danger-800: #8a1015  /* Very dark red */
danger-900: #6e0c10  /* Deepest red */
```

### Neutral Colors (Grays)
Soft, modern grays for text, borders, and backgrounds.

```css
neutral-50:  #fafbfc  /* Lightest gray - page backgrounds */
neutral-100: #f4f6f8  /* Very light gray - card backgrounds */
neutral-200: #e8ecf0  /* Light gray - borders */
neutral-300: #d1d8e0  /* Soft gray - dividers */
neutral-400: #a8b4c0  /* Medium gray - disabled states */
neutral-500: #7e8c9a  /* Gray - secondary text */
neutral-600: #5f6d7a  /* Dark gray - body text */
neutral-700: #44505c  /* Darker gray - headings */
neutral-800: #2d3843  /* Very dark gray - primary text */
neutral-900: #1a2229  /* Deepest gray */
neutral-950: #0f1419  /* Almost black */
```

---

## Typography

### Font Family
```css
font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
font-display: 'Inter', system-ui, sans-serif
```

### Font Sizes
```css
text-xs:   0.75rem  (12px) - line-height: 1rem
text-sm:   0.875rem (14px) - line-height: 1.25rem
text-base: 1rem     (16px) - line-height: 1.5rem
text-lg:   1.125rem (18px) - line-height: 1.75rem
text-xl:   1.25rem  (20px) - line-height: 1.75rem
text-2xl:  1.5rem   (24px) - line-height: 2rem
text-3xl:  1.875rem (30px) - line-height: 2.25rem
text-4xl:  2.25rem  (36px) - line-height: 2.5rem
```

---

## Spacing System

```css
spacing-1:   0.25rem  (4px)
spacing-2:   0.5rem   (8px)
spacing-3:   0.75rem  (12px)
spacing-4:   1rem     (16px)
spacing-5:   1.25rem  (20px)
spacing-6:   1.5rem   (24px)
spacing-8:   2rem     (32px)
spacing-10:  2.5rem   (40px)
spacing-12:  3rem     (48px)
spacing-16:  4rem     (64px)
spacing-18:  4.5rem   (72px)
spacing-20:  5rem     (80px)
```

---

## Border Radius

```css
rounded-sm:   0.25rem  (4px)  - Small elements
rounded:      0.375rem (6px)  - Default
rounded-md:   0.5rem   (8px)  - Medium elements
rounded-lg:   0.75rem  (12px) - Large elements
rounded-xl:   1rem     (16px) - Cards, panels
rounded-2xl:  1.5rem   (24px) - Large cards
rounded-3xl:  2rem     (32px) - Hero sections
rounded-full: 9999px          - Circles, pills
```

---

## Shadows

### Soft Shadows (Modern, Subtle)
```css
shadow-soft:     0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)
shadow-soft-lg:  0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.08)
shadow-soft-xl:  0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.1)
shadow-soft-2xl: 0 16px 48px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.12)
shadow-inner-soft: inset 0 2px 4px rgba(0, 0, 0, 0.06)
```

---

## Components

### Buttons

#### Primary Button (Teal)
```jsx
<button className="btn-primary">
  Primary Action
</button>
```
- Use for: Main actions, CTAs, submit buttons
- Color: Teal (primary-500)
- States: hover (primary-600), active (primary-700)

#### Secondary Button (Neutral)
```jsx
<button className="btn-secondary">
  Secondary Action
</button>
```
- Use for: Cancel, back, alternative actions
- Color: Neutral gray with border
- States: hover (neutral-200), active (neutral-300)

#### Success Button (Green)
```jsx
<button className="btn-success">
  Confirm
</button>
```
- Use for: Confirmations, approvals, success actions
- Color: Green (success-500)

#### Warning Button (Orange)
```jsx
<button className="btn-warning">
  Warning
</button>
```
- Use for: Caution actions, important notices
- Color: Orange (warning-500)

#### Danger Button (Red)
```jsx
<button className="btn-danger">
  Delete
</button>
```
- Use for: Destructive actions, deletions
- Color: Red (danger-500)

#### Accent Button (Orange)
```jsx
<button className="btn-accent">
  Featured Action
</button>
```
- Use for: Special features, highlighted actions
- Color: Orange (accent-500)

#### Outline Variants
```jsx
<button className="btn-outline-primary">Outline Primary</button>
<button className="btn-outline-secondary">Outline Secondary</button>
```

#### Ghost Variants
```jsx
<button className="btn-ghost">Ghost</button>
<button className="btn-ghost-primary">Ghost Primary</button>
```

#### Size Variants
```jsx
<button className="btn-primary btn-sm">Small</button>
<button className="btn-primary">Default</button>
<button className="btn-primary btn-lg">Large</button>
<button className="btn-primary btn-icon"><Icon /></button>
```

---

### Tabs

#### Pill Tabs (Default)
```jsx
<div className="tabs-container">
  <button className="tab tab-active">Active Tab</button>
  <button className="tab">Inactive Tab</button>
  <button className="tab">Another Tab</button>
</div>
```
- Use for: Primary navigation within a section
- Style: Rounded pills with soft background

#### Underline Tabs
```jsx
<div className="tabs-underline">
  <button className="tab-underline tab-underline-active">Active</button>
  <button className="tab-underline">Inactive</button>
</div>
```
- Use for: Secondary navigation, minimal style
- Style: Bottom border indicator

---

### Cards

#### Basic Card
```jsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content goes here</p>
  </div>
  <div className="card-footer">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Save</button>
  </div>
</div>
```

#### Hover Card
```jsx
<div className="card-hover">
  <!-- Card content -->
</div>
```
- Use for: Cards that need hover feedback
- Effect: Lifts up with enhanced shadow

#### Interactive Card
```jsx
<div className="card-interactive">
  <!-- Card content -->
</div>
```
- Use for: Clickable cards
- Effect: Hover lift + click scale animation

---

### Badges

```jsx
<span className="badge-primary">Primary</span>
<span className="badge-secondary">Secondary</span>
<span className="badge-success">Success</span>
<span className="badge-warning">Warning</span>
<span className="badge-danger">Danger</span>
<span className="badge-accent">Accent</span>
<span className="badge-neutral">Neutral</span>
```

- Use for: Status indicators, labels, counts
- Style: Rounded pills with colored backgrounds

---

### Filter Chips

```jsx
<button className="filter-chip">
  Filter Option
</button>

<button className="filter-chip filter-chip-active">
  Active Filter
</button>

<button className="filter-chip filter-chip-removable">
  Removable Filter
  <X size={14} />
</button>
```

- Use for: Filtering options, tags, selections
- Style: Rounded rectangles with borders
- States: Default, active, removable

---

### Layer Panels

```jsx
<div className="layer-panel">
  <div className="layer-header">
    <h4 className="layer-title">
      <Layers size={16} />
      Map Layers
    </h4>
  </div>
  <div className="layer-item layer-item-active">
    <input type="checkbox" checked />
    <span>Active Layer</span>
  </div>
  <div className="layer-item">
    <input type="checkbox" />
    <span>Inactive Layer</span>
  </div>
</div>
```

- Use for: Map controls, layer toggles, settings panels
- Style: Floating panel with backdrop blur

---

### Forms

#### Input Field
```jsx
<div>
  <label className="form-label">Field Label</label>
  <input type="text" className="form-input" placeholder="Enter value..." />
  <p className="form-helper">Helper text goes here</p>
</div>
```

#### Input with Error
```jsx
<div>
  <label className="form-label">Field Label</label>
  <input type="text" className="form-input border-danger-500" />
  <p className="form-error">
    <AlertCircle size={14} />
    Error message here
  </p>
</div>
```

---

### Toggle Switch

```jsx
<button 
  className={`toggle-switch ${isOn ? 'toggle-switch-on' : 'toggle-switch-off'}`}
  onClick={() => setIsOn(!isOn)}
>
  <span className={`toggle-switch-handle ${isOn ? 'toggle-switch-handle-on' : 'toggle-switch-handle-off'}`} />
</button>
```

---

## Animations

### Fade In
```jsx
<div className="animate-fade-in">
  Content fades in from top
</div>
```

### Slide In
```jsx
<div className="animate-slide-in">
  Content slides in from left
</div>
```

### Slide Up
```jsx
<div className="animate-slide-up">
  Content slides up from bottom
</div>
```

### Scale In
```jsx
<div className="animate-scale-in">
  Content scales in
</div>
```

---

## Usage Guidelines

### Color Usage
1. **Primary (Teal)**: Main actions, active states, primary navigation
2. **Secondary (Green)**: Success states, confirmations, growth indicators
3. **Accent (Orange)**: Featured content, special actions, highlights
4. **Danger (Red)**: Errors, deletions, critical warnings
5. **Neutral**: Text, borders, backgrounds, disabled states

### Accessibility
- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Use semantic HTML elements
- Provide focus states for all interactive elements
- Include aria-labels for icon-only buttons

### Responsive Design
- Mobile-first approach
- Touch targets minimum 44x44px
- Adequate spacing for touch interactions
- Responsive typography scaling

### Best Practices
1. Use consistent spacing (multiples of 4px)
2. Limit color palette usage per screen
3. Maintain visual hierarchy with size and weight
4. Use shadows sparingly for depth
5. Ensure smooth transitions (200-300ms)
6. Test in light and dark environments

---

## Implementation Notes

### Tailwind Configuration
All colors, spacing, and utilities are configured in `tailwind.config.js`

### CSS Classes
Component classes are defined in `src/index.css`

### Component Library
Reusable components are in `src/components/`

---

## Version History

**v1.0.0** - Initial design system based on EVERYWHERE and New Generations brand colors
- Extracted colors from logo files
- Created comprehensive color palette
- Defined component styles
- Established typography system
- Implemented modern, soft, and classy aesthetic
