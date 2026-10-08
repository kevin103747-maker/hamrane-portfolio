---
name: css-guide
description: "Quick navigation guide for globals.css sections - use when modifying styles"
trigger: agent
---

# CSS Navigation Guide for globals.css

When working with styles in this project, use this guide to quickly locate relevant sections in `src/app/globals.css` (92KB, 1603 lines).

## Quick Section Index

### Core & Layout (Lines 1-93)
- **Line 1-43**: Theme setup, CSS variables, color definitions
- **Line 44-70**: Base styles (html, body, links, buttons, container)
- **Line 71-93**: GNB/Header navigation styles

### Common Components (Lines 94-267)
- **Line 94-109**: Page/section titles
- **Line 110-127**: Index page (hero)
- **Line 128-147**: Work cards
- **Line 148-156**: Artists (horizontal flow)
- **Line 157-178**: Contact / Footer
- **Line 179-193**: Modals (video / artist)
- **Line 194-249**: Portfolio page
- **Line 250-267**: Pricing page

### Animations & Responsive (Lines 268-511)
- **Line 268-273**: Animations
- **Line 274-511**: Responsive breakpoints (desktop → mobile)

### Effects (Lines 512-638)
- **Line 512-560**: Motion (prefers-reduced-motion)
- **Line 561-638**: Mouse hover effects

### Admin & Features (Lines 639-785)
- **Line 639-710**: Pricing table (tabs, cards, difficulty)
- **Line 711-760**: Guide (commission process, FAQ)
- **Line 761-780**: Status tracking, 404/error buttons
- **Line 781-785**: Counter animation

### Components (Lines 786-918)
- **Line 786-795**: Header logo (theme-specific)
- **Line 796-809**: Status number animation
- **Line 810-812**: Social links
- **Line 813-833**: Social icons (tooltip)
- **Line 834-835**: Admin: track picker
- **Line 836-837**: Track turnaround/deadline badges
- **Line 838-840**: Package cards (horizontal)
- **Line 841-842**: Admin: turnaround, package quantity
- **Line 843-846**: Track turnaround one-liner
- **Line 847-859**: Quantity/bundle discount info
- **Line 860-865**: Package cards v2 (smaller, clearer)
- **Line 866-867**: Package cards v2.1 (reduced lines)
- **Line 868-871**: Package cards v3 (vertical + horizontal)
- **Line 872-881**: Package: preview card
- **Line 882-918**: Package: composition popup

### Admin v2 (Lines 919-1029)
- **Line 919-922**: Admin v2 layout (top bar, left menu, main)
- **Line 923-928**: Admin: collapsible sections, usage guide, save bar
- **Line 929-943**: Pricing page: collapsible bar, contact button
- **Line 944-1029**: Pricing: FAQ sections

### UI Components (Lines 1030-1146)
- **Line 1030-1054**: Menu labels (hover: EN → KR)
- **Line 1055-1067**: Pricing cards (summary + popup)
- **Line 1068-1078**: Popup deadline options
- **Line 1079-1088**: Discount info (text only)
- **Line 1089-1120**: Package popup: item prices
- **Line 1121-1130**: Quote maker (admin)
- **Line 1131-1146**: Home hero links

### Mobile Responsiveness (Lines 1147-1603)
- **Line 1147-1229**: Mobile adjustments (1st pass)
- **Line 1230-1348**: Mobile adjustments (2nd pass: cards, home, marquee, pricing, popup, guide)
- **Line 1349-1368**: Mobile header: contact button
- **Line 1369-1372**: Pricing footer contact link
- **Line 1373-1388**: Horizontal scroll chips (shadow + button)
- **Line 1389-1412**: Portfolio filter (mobile)
- **Line 1413-1423**: PC toolbar (search + chips + filters)
- **Line 1424-1431**: PC top menu (EN width + Contact spacing)
- **Line 1432-1434**: Pricing footer alignment
- **Line 1435-1450**: Mobile: track list horizontal
- **Line 1451-1458**: Mobile: prevent page overflow
- **Line 1459-1470**: Pricing tabs: scroll indicator
- **Line 1471-1488**: Featured works: horizontal list
- **Line 1489-1491**: Home hero: remove trailing slash
- **Line 1492-1509**: Mobile home hero: link layout
- **Line 1510-1512**: Featured works wrapper height
- **Line 1513-1525**: Very narrow phones (380px): header
- **Line 1526-1550**: Mobile portfolio toolbar
- **Line 1551-1603**: Bottom navigation (mobile only)

## Usage Tips

1. **For simple style changes**: Search by class name directly with grep
2. **For component work**: Jump to the section index above
3. **For responsive issues**: Check Lines 1147-1603 (mobile section)
4. **For admin work**: Lines 639-1029 (admin + pricing + guide)
5. **For theme work**: Lines 1-43 (CSS variables and theme definitions)

## Common Class Patterns

- `.gnb`: Header/navigation
- `.card`: Work cards
- `.modal`: Popups/modals
- `.hr-*`: Admin/Hamrane-specific components
- `.theme-switch`: Dark/light toggle
- `.burger`: Mobile menu button
