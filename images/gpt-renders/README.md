# LiminalDB Brand Assets - GPT Renders

Generated via ChatGPT image generation. These are the primary brand assets for LiminalDB.

## Current Assets

### liminaldb-hero-door-marks.png
**Status:** Ready to use
**Contents:**
- **Left:** Dark Tower-inspired stone archway with spiral portal - HERO IMAGE for marketing/landing
- **Top-right:** THE LOGO MARK - teal-gold flowing spiral with gold ring boundary
- **Bottom-right:** Spiral mark variation (no ring)

**Notes:** The top-right spiral with gold ring is the confirmed LiminalDB logo mark. The door is incredible hero imagery.

---

### liminaldb-logo-system-4up.png
**Status:** Ready - needs slicing
**Contents:**
- **Top-left:** Mark only on pure black (favicon candidate)
- **Top-right:** Horizontal lockup "LIMINALDB" on black
- **Bottom-left:** Horizontal lockup on white/light background
- **Bottom-right:** Mark on transparent background (checkered grid visible)

**Notes:** Good logo system showing mark in different contexts. Needs to be sliced into individual files.

---

### liminaldb-lockups-emerald-3up.png
**Status:** Ready - typography exploration
**Contents:**
- Three horizontal lockups on dark emerald background
- Different spiral rendering styles
- Typography: LIMINAL (bold) + DB (lighter weight)

**Notes:** Shows the approved typography direction. Middle lockup has best balance.

---

### liminaldb-variations-4up.png
**Status:** Ready - needs slicing
**Contents:**
- **Top-left:** Stacked lockup with mixed case "LiminalDB"
- **Top-right:** Horizontal lockup "LIMINALDB" with bold/light weight
- **Bottom-left:** Mark only (spiral alone)
- **Bottom-right:** Horizontal lockup with mixed case

**Notes:** Top-right shows the approved all-caps bold/light treatment.

---

## Brand Decisions (Confirmed)

| Element | Decision |
|---------|----------|
| **Logo Mark** | Teal-gold flowing spiral with gold ring boundary |
| **Typography** | All caps "LIMINALDB" - LIMINAL bold, DB lighter weight |
| **Primary Background** | Dark emerald (~#0D1B17) |
| **Accent Color** | Warm gold |
| **Secondary Color** | Teal accents in spiral |

## Emerald Dark Theme Palette

From Gemini text generation (hex codes for UI):

```
UI Foundation:
- #0D1B17  Editor Background (dark emerald-black)
- #162420  Sidebars/Panels
- #1F3832  Selection/Hover
- #2A4A42  Borders/Dividers

Typography:
- #E8E6D9  Primary Text (warm creamy off-white)
- #7A948D  Secondary/Muted (teal-green)

Accents:
- Gold primary (from logo)
- Teal secondary (from logo)
```

---

## Sliced Assets (in /sliced folder)

### Marks
| File | Description |
|------|-------------|
| `mark-with-ring.png` | THE logo mark - spiral with gold ring boundary |
| `mark-no-ring.png` | Spiral without ring |
| `mark-on-black.png` | Mark on pure black background |
| `mark-on-transparent.png` | Mark on transparent (has checkered grid baked in) |
| `mark-only-emerald.png` | Mark on dark emerald |

### Lockups
| File | Description |
|------|-------------|
| `lockup-horizontal-boldlight.png` | LIMINALDB with bold/light weight - APPROVED |
| `lockup-horizontal-on-black.png` | Horizontal on black |
| `lockup-horizontal-on-white.png` | Horizontal on white |
| `lockup-horizontal-mixedcase.png` | Mixed case version |
| `lockup-stacked-mixedcase.png` | Stacked layout |

### Hero Imagery
| File | Description |
|------|-------------|
| `hero-door-portal.png` | Dark Tower stone archway - hero image |

### Favicons
| File | Size |
|------|------|
| `favicon-16.png` | 16x16 |
| `favicon-32.png` | 32x32 |
| `favicon-180.png` | 180x180 (apple-touch) |

---

## Still Needed

### High Priority
- [x] ~~Slice composite images into individual assets~~ DONE
- [x] ~~Favicon versions (16x16, 32x32, 180x180 apple-touch)~~ DONE
- [ ] Lower fidelity/reduced color versions
- [ ] True transparent PNG of mark only (need to regenerate - current has grid baked in)
- [ ] SVG versions of logo (need to recreate or trace)

### Medium Priority
- [ ] LIMINAL BUILDER parent brand lockups (generated in Gemini, not exported)
- [ ] Monochromatic gold version on black
- [ ] Monochromatic white version on black
- [ ] OG image for social sharing (1200x630)

### Nice to Have
- [ ] Animated logo (spiral rotation)
- [ ] App icon variants (iOS, Android sizes)
- [ ] Email signature version

---

## Tool Notes

**Available:** `sips` (macOS) - can resize and convert formats
**Needed:** ImageMagick (`brew install imagemagick`) for slicing composite images

### Slicing Commands (once ImageMagick installed)
```bash
# Example: slice 4-up into quadrants
convert input.png -crop 50%x50% +repage output_%d.png
```

---

## Source Chats

Assets generated in ChatGPT chat titled "Color Modification Request" - can regenerate or iterate there.

Additional iterations done in 2 Gemini chats but quality wasn't as good - those have:
- Emerald Dark palette text (useful)
- LIMINAL BUILDER parent brand (needs re-export)
- UI mockup reference (emerald dark interface)
- Sacred geometry patterns (texture ideas)

---

*Last updated: 2025-12-31*
