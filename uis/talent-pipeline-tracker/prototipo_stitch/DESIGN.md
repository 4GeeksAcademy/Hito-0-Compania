---
name: Logistics Precision System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  max-width: 1440px
---

## Brand & Style
The design system is engineered for high-density logistics environments where clarity, speed of recognition, and reliability are paramount. The brand personality is authoritative yet approachable, reflecting a "command center" ethos that prioritizes data integrity and operational flow.

The visual style follows a **Corporate / Modern** aesthetic with a lean toward **Minimalism**. It utilizes expansive white space to reduce cognitive load in data-heavy screens, punctuated by high-contrast primary actions. The UI feels systematic and "engineered," using subtle borders and a structured grid to convey a sense of stability and institutional trust.

## Colors
The palette is rooted in "Deep Logistics Blue" to establish a professional, enterprise-grade foundation. 

- **Primary & Secondary:** Used for core branding, primary navigation, and high-emphasis actions.
- **Backgrounds:** The "Clean Slate" (#f8fafc) serves as the base canvas, providing a crisp contrast against white surface containers.
- **Semantic Palette:** These are utilized strictly for status communication. 
    - **Emerald:** Successful deliveries or accepted manifests.
    - **Amber:** Pending reviews or inventory discrepancies.
    - **Soft Blue:** Informational callouts and system logs.
    - **Indigo:** Technical stages, API statuses, or developer-facing integrations.

## Typography
This design system utilizes **Inter** for its exceptional legibility in technical interfaces and high x-height, which aids in reading long strings of alphanumeric tracking codes.

- **Scale:** A tight scale is used to maintain density. 
- **Weights:** Regular (400) is used for all body text to ensure maximum readability against light backgrounds. Semi-bold (600) and Bold (700) are reserved for hierarchy and data headers.
- **Data Display:** For tracking numbers and SKU codes, ensure the use of tabular figures (`tnum`) to maintain vertical alignment in tables.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop dashboards to ensure that complex data tables do not stretch beyond readable line lengths. 

- **Grid:** A 12-column grid with a 24px (1.5rem) gutter.
- **Rhythm:** An 8pt linear scale is used for all spatial relationships, with a 4pt sub-unit for tight component internals (like icon-to-text spacing).
- **Mobile:** On devices, the layout collapses to a single column with 16px side margins. Cards become the primary container for data units previously shown in table rows.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than aggressive shadows. This keeps the interface feeling "flat" and fast.

- **Level 0 (Background):** Slate (#f8fafc).
- **Level 1 (Surface):** Pure White (#ffffff) cards or containers with a 1px border (#e2e8f0).
- **Level 2 (Interaction):** A subtle, diffused shadow (0px 4px 6px -1px rgba(0, 0, 0, 0.05)) is applied only when an element is active or being dragged (e.g., reordering warehouse zones).
- **Overlays:** Modals and dropdowns use a slightly stronger shadow and a 1px border to separate from the underlying surface.

## Shapes
The shape language is **Soft** (4px / 0.25rem). This small radius provides a modern feel while maintaining the professional, "square" efficiency associated with logistics and shipping containers.

- **Standard Elements:** Buttons, inputs, and chips use a 4px radius.
- **Large Elements:** Primary dashboard cards and modals use an 8px (0.5rem) radius for a slightly softer container feel.

## Components
### Buttons
- **Primary:** Deep Logistics Blue background with white text. No gradient.
- **Secondary:** Ghost style with a 1px border of #cbd5e1 and Navy text.
- **Status:** Small, high-density buttons for quick actions in table rows.

### Data Tables
- **Header:** Light gray background (#f1f5f9) with uppercase label-sm typography.
- **Rows:** White background with a subtle hover state (#f8fafc). 
- **Cells:** Vertical padding of 12px for high density, 16px for standard visibility.

### Inputs & Dropdowns
- **Styling:** 1px border (#cbd5e1), 4px radius. Focus state uses a 2px offset ring of Primary Blue.
- **Dropdowns:** Include search functionality for large datasets (e.g., selecting from 500+ warehouse locations).

### Chips/Tags
- **Status Tags:** Use a "Light Tint" background of the semantic color (e.g., Success Green at 10% opacity) with dark-toned text of the same hue for maximum legibility.

### Cards
- **Usage:** Used for "KPI Tiles" at the top of dashboards. Features a 1px border, no shadow, and clear title-lg headers.