# Inventory Items Redesign

## Status

- Direction approved and implemented on 2026-08-13.
- Reference mockup: `mockups/13-inventory-items-production-v2.png`.
- The implemented view preserves inventory rules, persistence, and Forge behavior. Its API projection
  adds resolved ring tile statistics by reusing the authoritative Equipment calculation.

## Intent

Turn `/inventory/items` from a repeated-data card grid into a production game collection screen.
The collection should optimize recognition and selection, while one dedicated inspector presents
the selected item's complete information and contextual actions.

The result should feel like an armory or secured collection vault rather than a web catalogue. It
must remain legible, responsive, keyboard accessible, localized, and consistent with the current
BattleNess shell and Inventory environment.

## Reference Image

The approved concept uses three visual zones:

1. A compact game header preserves Inventory identity and account resources.
2. A collection workspace occupies roughly two thirds of the screen. Illustrated type tabs lead to
   search, element, sorting, count, and an artwork-first grid. Square tiles prioritize artwork,
   level, element, rarity, and selection instead of repeating full stat tables.
3. A persistent inspector occupies the right third. The selected item receives large artwork,
   identity, progression, key stats, sockets, contextual actions, and optional equipment comparison.

The visual language is a restrained tactical vault: near-black navy surfaces, metal framing, inset
rails, cyan navigation accents, ivory headings, rarity color at item level, and warm environmental
light around fire items. Depth comes from layered surfaces and focused lighting rather than many
generic cards.

## Current-State Findings

The current page already gets authoritative inventory data from `/api/player`, resolves localized
content names, filters by type and element, and uses `ItemDetailPanel` for accessible inspection.
Contextual management routes already lead to the appropriate Forge workflows.

The current presentation creates avoidable density:

- desktop item cards measure about 280 by 383 pixels;
- portrait cards measure about 343 by 350 pixels;
- metadata, experience, progression copy, bonus copy, and Inspect repeat on every item;
- artwork receives less emphasis than metadata;
- filters consume about 75 pixels on desktop and 156 pixels on portrait mobile;
- sparse inventories end in a large unstructured empty region;
- the grid and modal feel like separate web components rather than one collection workflow.

The existing view has no horizontal overflow. Its modal already implements inert background, focus
confinement, Escape and backdrop dismissal, scroll locking, and trigger-focus restoration. Preserve
those behaviors.

## Product Hierarchy

### Primary

- Recognize owned items from artwork and frames.
- Change category quickly.
- Select an item.
- Understand its combat and progression value.
- Reach the correct management workflow.

### Secondary

- Search by localized item name.
- Filter by element.
- Sort by useful inventory attributes.
- See owned and filtered counts.
- Identify equipped, socketed, or enchanted state.

### Deferred

- Capacity limits, because the current API exposes no authoritative maximum.
- Lock, favorite, bulk, dismantle, delete, and direct-sale actions.
- New mutation rules for gems, monsters, or spells.

## Desktop Structure

```text
Back | Items | Help

[All] [Rings] [Gems] [Monsters] [Spells]               12 items
[Search owned items] [Element] [Sort]

┌──────────────────── collection ────────────────────┐ ┌── inspector ──┐
│ [tile] [tile] [tile] [tile]                        │ │ selected art   │
│ [tile] [tile] [tile] [tile]                        │ │ identity       │
│ [tile] [tile] [tile] [tile]                        │ │ progression    │
│                                                   │ │ stats/sockets  │
│                                                   │ │ actions        │
└───────────────────────────────────────────────────┘ └────────────────┘
```

- Target `minmax(0, 1fr) 360px` for the wide split layout.
- Keep the inspector sticky below the shell top bar when viewport height permits.
- Use four or five collection columns based on available width.
- Give sparse inventories a framed collection floor instead of an abrupt empty page.
- Reuse the current Inventory vault background, with calmer contrast behind text.

## Item Tile

Each tile becomes one real selection button with no nested Inspect action.

Visible information:

- large item artwork;
- localized item name;
- level badge;
- compact element marker;
- rarity frame and restrained glow;
- equipped or used indicator when applicable;
- optional socket occupancy when it materially distinguishes the item.

Tiles also expose a compact type-specific combat-stat row:

| Item type | Tile statistics                              |
| --------- | -------------------------------------------- |
| Ring      | Damage, energy cost, cooldown                |
| Gem       | Added damage                                 |
| Monster   | Damage, health, cooldown                     |
| Spell     | No required tile statistic in this iteration |

Use icons plus localized labels or accessible names, but never rely on icons alone. Keep these values
to one compact row or a small aligned group so the artwork remains dominant. Do not add quality, XP,
bonus copy, targeting, socket detail, enchantment detail, or any other stat to the tile; those belong
to the inspector.

Expose `aria-pressed` for selection, a contextual accessible name that includes the visible combat
statistics, visible focus, a 44-pixel minimum target, distinct focus/hover/selection, and
reduced-motion behavior.

### Required Data Projection

Gem added damage and Monster damage, health, and cooldown already exist on the detailed inventory
projection. Ring tiles additionally require resolved damage, energy cost, and cooldown. Extend
`InventoryItemView` and the server inventory projection with these three optional fields for rings by
reusing the same authoritative resolution used by `EquipmentRingView`; do not recalculate ring or
socket contributions in the client.

Keep the fields optional at the shared type boundary because they are type-specific. Add focused API
coverage proving that ring values match the Equipment projection and that Gem and Monster tile
values remain authoritative.

## Collection Controls

- Replace the type select with localized tabs: All, Rings, Gems, Monsters, Spells.
- Add client-side search against resolved localized item names.
- Keep the compact element select for All, Electric, Fire, and Ice.
- Add client-side sort options: server order, level, quality, rarity, and name.
- Show owned and filtered counts, but no capacity maximum until the server owns one.
- Combine filters and provide a localized resettable empty state.

## Inspector

Create an Inventory-specific inspector backed by `InventoryItemView`. It should contain:

- large artwork and identity: name, type, rarity, element, and level;
- progression: XP, threshold, progress, quality, and quality bonus;
- item-type-appropriate combat stats;
- sockets, socketed ring, enchantment, targeting, and usage only when relevant;
- equipment state for rings;
- contextual actions using existing routes and behavior.

The inspector is also the read-only composition map for owned combat items. A Ring compares raw
definition values, its level-and-quality-resolved values, and final values after socketed Gems and
enchantments. It exposes speed and separates Ring, Gem, Monster, and Spell damage contributions.
Its socket tree includes empty sockets and nests each Gem's Monster or Spell enchantment.

Gems expose speed, their enchantment, and the containing Ring and socket when present. Monsters and
Spells expose speed plus energy and cooldown penalties, and link back to the Gem they enchant. Every
parent or child object in these relationships is a real selection control with artwork and localized
identity. Selecting one updates the current inspector, switches the collection category when needed,
and keeps the compact modal open. Both desktop and compact inspectors reset to the top after related
item navigation.

All resolved values and relationships come from the server Inventory projection. The client never
recalculates combat values. The relationship remains one-to-one for enchantments because persistence
uniquely constrains both the Gem and target item.

Contextual actions:

- ring: Equipment, Quality, and Socket;
- gem: Socket or Enchant;
- monster and spell: Enchant or Quality where supported;
- no destructive or invented action.

Direct ring equip may reuse `/api/inventory/equipment` only if the page loads authoritative
equipment state and preserves the existing limit and feedback. Otherwise, link to Equipment in the
first implementation. Comparison is also optional until backed by that endpoint.

## Responsive Behavior

### Wide desktop, 1180 pixels and above

- persistent collection and inspector split;
- four or five item columns;
- sticky inspector with bounded internal scrolling when necessary.

### Compact desktop and tablet, 701 to 1179 pixels

- three or four collection columns;
- inspector uses the existing accessible modal or a bounded overlay;
- controls wrap without becoming a tall dashboard panel.

### Mobile portrait, 700 pixels and below

- two compact item columns when artwork and names remain readable;
- one column only at the narrowest widths;
- horizontally scrollable category tabs without page-level overflow;
- search on one row, with element and sort below or beside it;
- tapping a tile opens the existing accessible detail modal as a full-height sheet;
- bottom navigation never covers the final row or modal actions.

### Short landscape

- prioritize collection width and compact tool height;
- use modal inspection rather than a persistent inspector;
- avoid nested page scrolling and preserve close and primary actions.

## Component Plan

New components:

- `InventoryCategoryTabs.vue` for categories, counts, and selected state;
- `InventoryCollectionToolbar.vue` for search, element, sort, and count;
- `InventoryItemTile.vue` for artwork-first selection;
- `InventoryItemInspector.vue` for the persistent desktop detail presentation.

Reuse `ItemArtwork.vue`, `ExperienceProgress.vue`, `SectionBackLink.vue`, and
`ViewHelpButton.vue`. Preserve the focus-locking and page-inert behavior of `ItemDetailPanel.vue` for
compact layouts.

Do not refactor `ItemDetailPanel` in a way that risks its Forge, Equipment, Loadouts, Materials, or
Market consumers. A separate Inventory inspector is acceptable for the first slice.

## State Model

Local state remains presentation-only:

- `typeFilter`;
- `elementFilter`;
- `searchQuery`;
- `sortOrder`;
- `selectedItemId`;
- `mobileInspectorOpen`.

Derived state covers localized search, category counts, filtered and sorted items, selected item,
management routes, and optional equipment comparison.

Desktop may initially select the first visible item so the inspector is useful. Mobile must never
open a modal automatically. Filter changes preserve visible selection or fall back to the first
visible item while keeping the mobile modal closed. Empty results clear selection.

## Styling And Localization

- Keep `main.css` as ordered imports only.
- Put this view's styles in `sections/05-inventory-cards.css`.
- Reuse shared tokens and the existing vault background and item assets.
- Treat the generated mockup as composition guidance, not runtime artwork.
- Put new visible and accessible strings under `inventory.items` in both catalogues.
- Verify exact English/French key parity.

## Implementation Sequence

### Slice 1: Collection foundation

- Add category tabs, localized search, element filter, sort, and counts.
- Replace repeated cards with artwork-first selectable tiles.
- Expose and render the approved type-specific tile statistics through the authoritative server
  projection.
- Preserve `/api/player`, empty/loading/error states, and modal inspection.

### Slice 2: Production inspector

- Add the persistent desktop inspector.
- Reuse existing detail derivation without changing domain values.
- Keep the accessible modal for compact layouts.
- Add contextual routes only, without new mutations.

### Slice 3: Equipment integration

- Load existing equipment state when needed.
- Add real equipped state and optional comparison.
- Decide whether direct equip belongs here or remains in Equipment.

### Slice 4: Polish and scale

- Tune sparse and large collections.
- Add restrained selection lighting, rarity treatment, and transitions.
- Verify long French names, maximum values, keyboard flow, touch targets, reduced motion, modal
  confinement, scrolling, and shell overlap.

## Acceptance Checklist

- Collection filters and items work with keyboard and touch.
- Every item remains identifiable without opening details.
- Ring tiles show damage, energy cost, and cooldown; Gem tiles show added damage; Monster tiles show
  damage, health, and cooldown; no unapproved statistics are added to Spell tiles.
- Ring tile values match the authoritative Equipment projection rather than a client-side formula.
- Complete authoritative item data remains available.
- Rings compare base, Ring-only, and final damage, energy, cooldown, and speed values and expose a
  navigable socket and enchantment tree.
- Gems, Monsters, and Spells expose the requested speed and penalty values plus navigable parent or
  child relationships with artwork.
- Desktop selection does not open a blocking modal.
- Compact layouts preserve accessible modal behavior.
- Item tiles contain no nested interactive controls.
- No horizontal overflow occurs at desktop, portrait, or short landscape.
- Bottom navigation does not cover collection or modal actions.
- Long English and French content does not clip.
- No hardcoded visible copy is introduced.
- Catalogue parity, typecheck, lint, Prettier, scoped tests, and `git diff --check` pass.
- Forge, Materials, Equipment, Loadouts, Market, live battle, and Dev Lab remain unchanged.
