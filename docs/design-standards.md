# Signal App — Design Standards

> Both portal (web) and app (Capacitor iOS) must follow these standards.
> Last updated: Jul 2026

---

## CSS Variables (defined in `globals.css`)

```
--bg    #070D1A   page background
--surf  #0E1628   surface / card background
--surf2 #162038   elevated surface
--bdr   #1C2E4A   border color

--txt   #fff      primary text
--dim   #7A8BAA   secondary text
--dim2  #3A4E6A   muted text

--blu   #1740F5   primary blue
--bluL  #4F6FFA   light blue
--grn   #00D4A0   green / positive
--red   #FF3B5C   red / negative
--org   #FF5C1A   orange / accent
--ylw   #FFB800   yellow / warning
--pur   #8B5CF6   purple
```

---

## Breakpoints

| Name | Width | Behaviour |
|---|---|---|
| Desktop | > 900px | Full multi-column layout |
| Tablet | ≤ 900px | Collapse to 1-col; side padding 20px |
| Phone | ≤ 480px | Side padding 16px; further stack |

---

## Dashboard Grid Classes (`globals.css`)

For dashboard pages — apply these `className` values directly, no custom CSS needed.

| Class | Desktop | Tablet ≤900px | Phone ≤480px |
|---|---|---|---|
| `.g4` | 4 col | 2 col | 2 col |
| `.g3` | 3 col | 2 col | 1 col |
| `.g2` | 2 col | 2 col | 1 col |
| `.g-analytics` | `1fr + 210–270px` | 1fr | 1fr |
| `.mob-hide` | `table-cell` | `table-cell` | `display:none` |

---

## Public Page Grid Classes (About, Landing, etc.)

Public pages use bento-grid layouts with custom `ab-*` class prefix.
Responsive CSS lives in a `<style>` block inside the page component.

| Class | Purpose | Desktop | Tablet ≤900px | Phone ≤480px |
|---|---|---|---|---|
| `.ab-outer` | Main content container | `padding: 0 40px` | `0 20px` | `0 16px` |
| `.ab-hero` | Hero section | `padding: 88px 40px` | `64px 20px` | `56px 16px` |
| `.ab-row-a` | 3-col bento row | `1fr 1fr 1fr` | `1fr` | `1fr` |
| `.ab-row-b` | 4-col stats chips | `repeat(4,1fr)` | `repeat(2,1fr)` | `repeat(2,1fr)` |
| `.ab-row-c` | 2-col founder cards | `1fr 1fr` | `1fr` | `1fr` |
| `.ab-row-d` | Timeline + Values | `1fr 2fr` | `1fr` | `1fr` |
| `.ab-row-e` | 3-col contact | `repeat(3,1fr)` | `1fr` | `1fr` |
| `.ab-vals` | Values inner grid | `1fr 1fr 1fr` | `1fr 1fr` | `1fr` |
| `.ab-cta` | CTA section | `padding: 44px 48px` | unchanged | `32px 24px` |
| `.ab-founder-row` | Avatar+name flex | `row` | `row` | `column` |

### CRITICAL RULE
Every CSS class selector in a `<style>` block MUST have a matching `className` prop on the JSX element. Missing `className` = dead CSS = broken mobile. No exceptions.

---

## Glass Card Style

Applied to all cards on public pages (About, Landing):

```tsx
const GLS: React.CSSProperties = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.09)',
};
```

Coloured glow variant (add per-card accent):
```tsx
boxShadow: `0 8px 48px rgba(23,64,245,0.20), inset 0 1px 0 rgba(255,255,255,0.10)`
```

---

## Gradient Text Helper

```tsx
const grd = (g: string): React.CSSProperties => ({
  background: g,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

// Usage:
<span style={grd('linear-gradient(135deg,#4F6FFA,#8B5CF6)')}>text</span>
```

Common gradients used:
- Blue-purple (hero accent): `linear-gradient(135deg,#4F6FFA,#8B5CF6)`
- Orange-yellow (price/cta): `linear-gradient(135deg,#FF5C1A,#FFB800)`
- Green: `linear-gradient(135deg,#00D4A0,#00875A)`

---

## Typography Scale

| Element | Size | Weight | Notes |
|---|---|---|---|
| Page hero h1 | `clamp(36px,6vw,72px)` | 900 | `letterSpacing: -2.5` |
| Section heading | `clamp(22px,3vw,36px)` | 900 | `letterSpacing: -1` |
| Card title | 20–24px | 800–900 | |
| Body text | 14–17px | 400 | `lineHeight: 1.7–1.8` |
| Label / badge | 11px | 700 | `letterSpacing: 2px, textTransform: uppercase` |
| Tag chip | 11px | 700 | `padding: 3px 8px, borderRadius: 5` |

---

## Skill Tag Chips

```tsx
<span style={{
  fontSize: 11, fontWeight: 700,
  padding: '3px 8px', borderRadius: 5,
  background: 'rgba(23,64,245,0.10)',
  color: 'var(--bluL)',
  border: '1px solid rgba(23,64,245,0.25)',
}}>Tag label</span>
```

---

## Mobile-Specific Rules

1. **No horizontal scroll** — every page must fit within viewport width on 390px screens
2. **Bottom nav clearance** — dashboard pages: `padding-bottom: calc(80px + env(safe-area-inset-bottom))`
3. **Touch targets** — minimum 44px height for all interactive elements (buttons, links)
4. **Font sizes** — minimum 12px rendered on mobile; never use px values below 11px
5. **Sidebar** — hidden on ≤900px, replaced by mobile bottom nav

---

## Founder / Team Card Pattern

```
CO-FOUNDER label (11px, dim, uppercase, letterSpacing 2px)
[Avatar 72×72 rounded-18] [Name 20px 900] [Title 13px 700 accent-color]
[Skill tag chips — row, flexWrap]
[Bio paragraph — 13px dim, lineHeight 1.78]
[Social links — 34px height buttons]
```

Avatar initials: gradient background matching card accent colour.
On phone (≤480px): avatar+name flex row stacks to column via `.ab-founder-row`.

---

## Stat Chip Pattern

```
[Big number — clamp(28px,4vw,42px), weight 900, accent color]
[Label — 13px 700]
[Sub-label — 12px dim2]
```

Card: `borderRadius: 16, padding: '22px 20px'`, glass base + coloured gradient + glow.

---

## Contact Card Pattern

Three cards in `.ab-row-e` (collapses to 1-col on tablet):
- Icon (28px emoji)
- Label (11px uppercase dim)
- Email link (14px 700 accent colour)
- Sub-text (12px dim2)

---

## SEBI / Legal Disclaimer (mandatory on every page with signals or prices)

```
Not SEBI registered · Not investment advice · DYOR
```

US stocks additionally:
```
Not SEC registered · Not investment advice · DYOR
```

Paper trading:
```
Virtual only — no real orders placed
```
