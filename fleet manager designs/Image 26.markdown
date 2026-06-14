---
name: Institutional Fleet Management
colors:
  surface: '#f9f9f7'
  surface-dim: '#dadad8'
  surface-bright: '#f9f9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e8e8e6'
  surface-container-highest: '#e2e3e1'
  on-surface: '#1a1c1b'
  on-surface-variant: '#47464b'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#77767b'
  outline-variant: '#c8c5cb'
  surface-tint: '#5f5e61'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1e'
  on-primary-container: '#858387'
  inverse-primary: '#c8c5ca'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d1b16'
  on-tertiary-container: '#88837c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e1e6'
  primary-fixed-dim: '#c8c5ca'
  on-primary-fixed: '#1b1b1e'
  on-primary-fixed-variant: '#47464a'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#e8e2d9'
  tertiary-fixed-dim: '#cbc6bd'
  on-tertiary-fixed: '#1d1b16'
  on-tertiary-fixed-variant: '#494640'
  background: '#f9f9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e1'
  surface-card: '#FFFFFF'
  border-subtle: '#E5E5E0'
  compliance-green: '#16A34A'
  danger-red: '#DC2626'
  major-defect-orange: '#EA580C'
  plate-yellow: '#FFDE00'
  plate-blue: '#003399'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.04em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  plate-text:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 240px
  card-padding: 24px
  grid-unit: 8px
  gutter: 16px
  margin-page: 32px
---

## Brand & Style
The design system is engineered for professional accountability and regulatory compliance. It targets fleet managers and transport officers who require high-density data visualization without cognitive overload. 

The aesthetic is **Institutional Minimalism**: a synthesis of the functional clarity of the GOV.UK Design System with the refined, high-performance interface patterns of modern developer tools. It emphasizes precision, authority, and reliability through:
- **Strict Structural Grids**: An unwavering 8px baseline and module grid.
- **Atmospheric Neutrality**: A warm, paper-like background that reduces eye strain during long-form data review.
- **Functional Color**: Color is never decorative; it is a semiotic tool used exclusively to signal compliance status, defect severity, or system state.

## Colors
The palette is rooted in institutional authority. The primary background uses a warm ivory (`#FAFAF8`) to distinguish the application from generic "white-label" SaaS products and provide a sophisticated canvas for pure white (`#FFFFFF`) card surfaces.

- **Status Signaling**: Use `compliance-green` for passed inspections, `danger-red` for immediate prohibitions, and `major-defect-orange` for advisory notices.
- **Interactive Accents**: `F59E0B` (Amber) is reserved for active navigation states and primary action highlights, echoing the safety lighting of fleet vehicles.
- **Regulatory Identity**: `plate-yellow` is used specifically for UK vehicle registration components to provide immediate visual recognition of asset identifiers.

## Typography
Typography is the primary driver of hierarchy. **Inter** is used for all interface elements, utilizing tight letter-spacing for headlines to create a "dense," authoritative feel. 

**JetBrains Mono** is introduced as a functional secondary typeface for all non-prose data, including VIN numbers, Odometer readings, and UK Number Plates. This ensures that character-specific data is unambiguous (e.g., distinguishing '0' from 'O'). 

For mobile devices, `display-lg` scales down to 24px to maintain readability within the dashboard's dense layout.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The sidebar is fixed at 240px, while the main content area utilizes a fluid 12-column grid that scales to a maximum width of 1600px to ensure data density remains manageable on ultra-wide monitors.

- **The 8px Rule**: All margins, padding, and gaps must be multiples of 8px.
- **Consistency**: Page headers and primary metric rows should align to the 32px page margin. 
- **Card Spacing**: Dashboard widgets utilize a 24px internal padding to provide "breathing room" against the heavy data they contain.

## Elevation & Depth
This design system avoids shadows in favor of **Structural Layering**. 

- **Tiers**: The background sits at the lowest level. Cards and surfaces are "elevated" using 1px solid borders in `#E5E5E0`.
- **Active State**: Interactive elements (like a selected sidebar item) do not use depth; they use a solid vertical 2px "indicator" in WalkSafe Amber.
- **Flat Surface**: Modals and overlays use a high-contrast 1px border with a very subtle, sharp 4px shadow to distinguish from the background, avoiding any diffused or "blurry" aesthetics.

## Shapes
Shapes are conservative and geometric. A standard `0.25rem` (4px) radius is applied to buttons, input fields, and small UI components. Larger containers like cards use a `0.5rem` (8px) radius. This "Soft" sharp-edge approach maintains an institutional feel without the aggression of 0px corners or the informality of high-radius curves.

## Components
- **Sidebar**: Dark-themed (`#18181B`). Navigation links use high-contrast white text when active, accompanied by an Amber left-edge indicator. Icons should be 18px stroke-based glyphs.
- **Metric Cards**: Pure white background with a 1px border. The primary metric (e.g., "98%") should be rendered in `headline-md` JetBrains Mono for a technical, high-precision look.
- **UK Number Plates**: Components should feature a `#FFDE00` background, a 4px blue strip on the left with white "GB" text, and `plate-text` typography.
- **Status Pills**: Use a 10% opacity version of the status color for the background and a 100% saturated version for the text (e.g., Compliance Green text on a very pale green background).
- **Inputs**: Use `#FFFFFF` backgrounds with `#E5E5E0` borders. Focus states should swap the border to `#18181B` with no outer glow.
- **Buttons**: Primary buttons are solid `#18181B` with white text. Secondary buttons are white with a 1px border. No gradients.