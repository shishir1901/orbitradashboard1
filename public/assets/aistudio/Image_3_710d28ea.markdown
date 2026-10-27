---
name: Aerospace Mission Control
colors:
  surface: '#0e1321'
  surface-dim: '#0e1321'
  surface-bright: '#343949'
  surface-container-lowest: '#080e1c'
  surface-container-low: '#161b2a'
  surface-container: '#1a1f2e'
  surface-container-high: '#242a39'
  surface-container-highest: '#2f3444'
  on-surface: '#dde2f6'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dde2f6'
  inverse-on-surface: '#2b3040'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#deb7ff'
  on-secondary: '#4a007f'
  secondary-container: '#6b13af'
  on-secondary-container: '#d4a5ff'
  tertiary: '#dbffde'
  on-tertiary: '#003918'
  tertiary-container: '#34f885'
  on-tertiary-container: '#006e35'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f1dbff'
  secondary-fixed-dim: '#deb7ff'
  on-secondary-fixed: '#2d0050'
  on-secondary-fixed-variant: '#680eac'
  tertiary-fixed: '#62ff96'
  tertiary-fixed-dim: '#00e475'
  on-tertiary-fixed: '#00210b'
  on-tertiary-fixed-variant: '#005226'
  background: '#0e1321'
  on-background: '#dde2f6'
  surface-variant: '#2f3444'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
  telemetry-readout:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-fidelity, mission-critical operations console aesthetic tailored for real-time telemetry, orbital tracking, and CubeSat ground operations. The visual posture reflects uncompromising precision, zero-latency situational awareness, and extreme operational reliability.

The visual style synthesizes technical utilitarianism with modern aerospace instrumentation:
- **Utilitarian Telemetry HUD**: Uncluttered data-density supported by crisp, structural surface divisions, micro-aperture status readouts, and monospace alignment.
- **Controlled Luminescence**: Purposeful contrast where deep void substrates isolate high-energy signals. Electric cyan is reserved strictly for live telemetry streams, active vectors, and primary operational feedback.
- **Instrument Precision**: Minimalist structural geometry with subtle 1px frame enclosures and technical corner accents reminiscent of flight-ready console avionics.

## Colors

The color palette is engineered to sustain zero optical fatigue during continuous orbital monitoring while providing unambiguous semantic clarity.

### Color Matrix & Roles
- **Primary (`#00F0FF`)**: Dynamic telemetry active states, vector lines, active transponder links, and interactive focal points.
- **Secondary (`#7B2CBF`)**: Deep-space trajectories, orbital phase brackets, auxiliary subsystems, and secondary command triggers.
- **Tertiary (`#00E676`)**: Nominal lock, nominal downlink integrity, battery positive state, and successful validation handshakes.
- **Neutral Foundation (`#060B19`)**: Ground canvas void base. Modulated with atmospheric chassis layers:
  - Surface Void: `#060B19` (Canvas root)
  - Surface Console Base: `#0B132B` (Docking containers, panel structures)
  - Surface Panel Elevated: `#1C2541` (Instrument panels, interactive modules, active telemetry decks)
  - Border Subdued: `rgba(0, 240, 255, 0.12)` (Standard containment grid)
  - Border Active: `rgba(0, 240, 255, 0.45)` (Selected or tracking frame)

### Operational Semantics
- **Nominal Signal**: `#00E676` (Telemetry nominal / Pass clear)
- **Caution / Divergence**: `#FFB300` (Thermal threshold warnings, slew drift)
- **Critical Alert**: `#FF1744` (Loss of signal, trajectory degradation, bus faults)

## Typography

Typography enforces a strict split between organizational command hierarchy and real-time mission telemetry:

- **Inter (Command Sans)**: Governs screen titles, operational panel headers, module titles, and mission modal dialogues. Set with crisp negative letter tracking at larger scales to optimize spatial economy.
- **JetBrains Mono (Telemetry Monospace)**: Governs data streams, coordinate readouts, subsystem statuses, hex codes, log rows, and technical parameter labels. Tabular alignment ensures that fluctuating numerical telemetry values never induce horizontal visual jitter.
- **Uppercase Discipline**: Micro-labels, subsystem IDs, and status descriptors are consistently rendered in uppercase with elevated letter spacing (`0.05em` to `0.08em`) to guarantee quick recognition on busy operations displays.

## Layout & Spacing

The layout is anchored in a high-density, multi-pane mission operations console.

### Layout Model
- **Grid Architecture**: A modular 12-column fluid grid that scales from expansive multi-monitor telemetry setups down to single-display command terminals.
- **Density Profile**: High spatial efficiency. Spacing between interactive parameters and data feeds is condensed (`space-xs` to `space-sm`) to maximize situational awareness on a single screen without vertical pagination.
- **Breakpoints**:
  - `Desktop Ops (>= 1440px)`: Fixed 4-quadrant layout with persistent left-hand orbital map, central telemetry matrix, and right-hand command terminal.
  - `Console Screen (1024px - 1439px)`: 2-column stacked layout with collapsible telemetry logs.
  - `Field Mobile (< 1024px)`: Single-column priority feed. Telemetry values compress to compact vertical key-value lists with dedicated subsystem swipe tabs.

## Elevation & Depth

Visual depth is communicated through technical layering, distinct border lines, and precision photon glows rather than soft organic drop shadows.

### Atmospheric Hierarchy
1. **Basal Deck (`#060B19`)**: Ground canvas displaying coordinate grids, coordinate ticks, and dormant background telemetry matrices.
2. **Subsystem Bay (`#0B132B`)**: Primary structural panels framed by a 1px border of `rgba(0, 240, 255, 0.15)`.
3. **Active Instrument Module (`#1C2541`)**: Focused telemetry cards and live diagnostic widgets framed by `rgba(0, 240, 255, 0.35)`.
4. **Command HUD Overlays**: Floating modal overrides and warning overlays elevated via crisp 1px borders paired with an ambient cyan glow (`0 0 16px rgba(0, 240, 255, 0.25)`).

### Grid Backdrops
Cards and map panels feature a low-contrast vector grid backdrop (`linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px)`) set at 16px intervals to visually reference engineering coordinate graph paper.

## Shapes

The design system employs a soft, machined structural silhouette with a roundedness level of `1` (base `0.25rem` / `4px`).

- **Base Radius (`0.25rem`)**: Standard panels, telemetry buttons, input fields, and log segments. This minimal corner soften prevents visual distraction while avoiding an overly brutalist, jagged appearance.
- **HUD Badges & Chips**: Strict adherence to the `0.25rem` radius ensures badges look like hardware status plates rather than consumer pill-shaped pills.
- **Technical Chamfers (Optional Utility)**: Corner cutouts (45-degree micro-chamfers) can be applied to top-right card headers via CSS clip-paths to evoke avionic chassis housings.

## Components

### Buttons & Command Triggers
- **Primary Command Action**: Solid background in `#00F0FF` with `#060B19` text in `JetBrains Mono` (SemiBold). Sharp hover transition to bright state with edge glow: `box-shadow: 0 0 12px rgba(0, 240, 255, 0.4)`.
- **Secondary Uplink Action**: Ghost frame (`1px solid rgba(0, 240, 255, 0.4)`), background `rgba(11, 19, 43, 0.6)`, text `#00F0FF`.
- **Destructive/Emergency Action**: `#FF1744` stroke and fill highlights with red edge glow. Used strictly for mission abort, sequence override, or RF kill sequences.

### Telemetry Cards & Avionics Panels
- Enclosed with `1px solid rgba(0, 240, 255, 0.15)`.
- Panels incorporate a discrete header bar displaying subsystem identifier (e.g., `[SYS_PWR]`, `[ORB_NAV]`) in `label-sm` alongside status indicators.
- Internal telemetry reads pair small muted labels with large monospace readouts (`telemetry-readout`).

### HUD Status Badges & Indicators
- Compact, monospaced inline tags.
- Three critical states:
  - **NOMINAL**: Background `rgba(0, 230, 116, 0.12)`, border `rgba(0, 230, 116, 0.4)`, text `#00E676`. Includes a pulsing `6px` status dot.
  - **WARN**: Background `rgba(255, 179, 0, 0.12)`, border `rgba(255, 179, 0, 0.4)`, text `#FFB300`.
  - **CRIT**: Background `rgba(255, 23, 68, 0.15)`, border `rgba(255, 23, 68, 0.6)`, text `#FF1744`.

### Input & Command Prompt Fields
- Terminal command line styling.
- Background `#0B132B`, border `1px solid rgba(0, 240, 255, 0.25)`.
- Focus ring: `1px solid #00F0FF` with inner drop shadow `inset 0 0 6px rgba(0, 240, 255, 0.2)`. Caret styled as cyan blinking monospace block.

### Technical Gauges & Progress Bars
- Linear bars use step-segmented notches (e.g., 20 discrete divisions) rather than continuous fills to communicate calibrated telemetry levels.
- Fill color tracks parameter bands: Nominal (`#00F0FF` or `#00E676`), Warning (`#FFB300`), Critical (`#FF1744`).