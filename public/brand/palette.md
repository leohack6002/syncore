# Syncora Brand Palette

Syncora uses a minimal, premium dark identity with small electric accents. The system is designed for productivity surfaces, desktop launchers, favicons, GitHub previews, and release artifacts.

## Core Colors

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#07090F` | Primary icon tile, app chrome, dark surfaces |
| Graphite | `#0B0E17` | Secondary dark surface |
| Slate | `#151A27` | Panels, dividers, inactive UI |
| White | `#F8FBFF` | Primary mark highlight and text on dark |
| Electric Cyan | `#28D7FF` | Sync and inbound communication accent |
| Signal Blue | `#318CFF` | Primary product accent |
| Violet | `#9B7CFF` | Outbound communication accent |

## Logo Notes

The Syncora mark combines two directional arcs with a central communication rail. It should remain geometric, high contrast, and readable at small sizes.

Use `syncora-logo.png` as the canonical 1024x1024 source for native app icons. Use `syncora-logo.svg` for scalable GitHub, README, web, and design-system usage. Use `favicon.svg` for browser contexts.

## Icon Generation

Regenerate native desktop icons after changing `syncora-logo.png`:

```bash
npm run brand:icons
```

This runs the official Tauri icon generator and refreshes `src-tauri/icons`.
