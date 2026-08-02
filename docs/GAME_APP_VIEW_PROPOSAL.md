# Game App View Proposal

This document proposes the player-facing Game App structure. It is separate from the Dev Lab, which remains in `apps/prototype` for technical testing and diagnostics.

## Navigation Model

Recommendation: use a persistent application shell with a main navigation menu and route-level sections.

```text
BattleNess App
+-- Home
+-- Battle
|   +-- Campaign
|   +-- PvP
|   |   +-- Private Match
|   |   +-- Casual Match
|   |   +-- Ranked Match
|   +-- Battle History
+-- Forge
|   +-- Craft
|   +-- Socket
|   +-- Enchant
|   +-- Quality
+-- Inventory
|   +-- Items
|   +-- Materials
|   +-- Equipment
|   +-- Loadouts
+-- Market
|   +-- Game Market
|   +-- Player Market
+-- Profile
    +-- Overview
    +-- Progression
    +-- Match History
    +-- Settings
```

## Route Proposal

```text
/                         -> Home dashboard
/battle                   -> Battle hub
/battle/campaign          -> Campaign opponent selection
/battle/pvp               -> PvP hub
/battle/pvp/private       -> Private match create/join by code
/battle/pvp/casual        -> Casual matchmaking
/battle/pvp/ranked        -> Ranked matchmaking and rank overview
/battle/history           -> Past battle records
/battle/live/:battleId    -> Active battle screen

/forge                    -> Forge hub
/forge/craft              -> Craft items from recipes and materials
/forge/socket             -> Add/remove gems from rings
/forge/enchant            -> Bind/remove spell or monster enchantments on gems
/forge/quality            -> Improve item quality with credits

/inventory                -> Inventory hub
/inventory/items          -> Rings, gems, monsters, spells
/inventory/materials      -> Material stock
/inventory/equipment      -> Equipped rings and active combat loadout
/inventory/loadouts       -> Saved ring loadouts

/market                   -> Market hub
/market/game              -> Buy/sell with the game economy
/market/players           -> Player listings and purchases

/profile                  -> Profile overview
/profile/progression      -> Hero level, XP, unlocks
/profile/history          -> Match and reward history
/profile/settings         -> Account, language, audio, preferences
```

## Main Shell

Purpose: stable frame for all player-facing screens.

```text
+--------------------------------------------------------------------------------+
| [BattleNess]                         [Credits] [Hero Level] [Profile/Settings] |
+--------------------------------------------------------------------------------+
| {Home} {Battle} {Forge} {Inventory} {Market} {Profile}                         |
+--------------------------------------------------------------------------------+
| [Route Content]                                                                 |
+--------------------------------------------------------------------------------+
```

Technical responsibilities:

- Resolve authenticated player state.
- Display top-level resources: credits, hero level, maybe current energy only inside battle.
- Own language selection once localization is wired into the Game App.
- Provide route navigation.
- Avoid Dev Lab-only controls.

## Home

Purpose: quick status and shortcuts.

```text
+--------------------------------------------------------------------------------+
| [Player Summary]                                                                |
| - username                                                                      |
| - hero level / XP progress                                                      |
| - credits                                                                       |
+--------------------------------------------------------------------------------+
| [Primary Actions]                                                               |
| {Continue Campaign} {Find PvP Match} {Open Forge} {Open Inventory}              |
+--------------------------------------------------------------------------------+
| [Current Loadout Summary]                                                       |
| - equipped rings count                                                          |
| - speed                                                                         |
| - rough damage / energy / cooldown summary                                      |
+--------------------------------------------------------------------------------+
| [Recent Activity]                                                               |
| - last battle result                                                            |
| - latest crafted item                                                           |
| - latest rewards                                                                |
+--------------------------------------------------------------------------------+
```

MVP status: useful after battle, inventory, and forge APIs exist.

## Battle Hub

Purpose: choose the battle mode.

```text
+--------------------------------------------------------------------------------+
| [Battle Modes]                                                                  |
| [Campaign Card]       [PvP Card]             [Battle History Card]              |
| - solo progression    - private/casual/ranked - replay records                  |
| - rewards preview     - matchmaking status    - result review                   |
+--------------------------------------------------------------------------------+
| [Active Loadout]                                                                |
| - selected loadout                                                               |
| - validation warnings                                                           |
| - {Edit Loadout}                                                                |
+--------------------------------------------------------------------------------+
```

Recommendation:

- Implement Campaign first after inventory/backend structure is stable.
- Implement Private PvP before casual matchmaking.
- Keep Ranked visible only when ranking rules exist, or show it as locked/unavailable.

## Campaign

Purpose: solo progression against game-owned opponents.

```text
+--------------------------------------------------------------------------------+
| [Campaign Progress]                                                             |
| - current chapter/track                                                         |
| - unlocked opponents                                                            |
+--------------------------------------------------------------------------------+
| [Opponent List or Map]                                                          |
| - opponent card                                                                 |
|   - name                                                                        |
|   - recommended level                                                           |
|   - elemental theme                                                             |
|   - reward preview                                                              |
|   - locked/unlocked/completed state                                             |
+--------------------------------------------------------------------------------+
| [Selected Opponent Details]                                                     |
| - known rings/monsters/spells if revealed                                       |
| - first-clear rewards                                                           |
| - repeat rewards                                                                |
| - {Start Battle}                                                                |
+--------------------------------------------------------------------------------+
```

MVP status: later, after the Game App can build a battle setup from database-owned player inventory.

## PvP

Purpose: multiplayer entry point.

```text
+--------------------------------------------------------------------------------+
| [PvP Mode Selector]                                                             |
| {Private Match} {Casual Match} {Ranked Match}                                   |
+--------------------------------------------------------------------------------+
| [Private Match]                                                                 |
| - {Create Code}                                                                 |
| - {Join Code}                                                                   |
+--------------------------------------------------------------------------------+
| [Casual Match]                                                                  |
| - selected loadout                                                              |
| - matchmaking state                                                             |
| - {Find Match}                                                                  |
+--------------------------------------------------------------------------------+
| [Ranked Match]                                                                  |
| - rank / rating                                                                 |
| - season status                                                                 |
| - {Find Ranked Match}                                                           |
+--------------------------------------------------------------------------------+
```

Recommendation:

- Private Match should be the first PvP implementation.
- Casual matchmaking comes after private matches.
- Ranked should wait until ranking, seasons, anti-cheat/server authority, and reward rules are clearer.

## Active Battle

Purpose: player-facing combat screen.

```text
+--------------------------------------------------------------------------------+
| [Opponent Summary]                                                              |
| - hero health                                                                   |
| - energy                                                                        |
| - public monsters                                                               |
+--------------------------------------------------------------------------------+
| [Battlefield]                                                                   |
| [Opponent Hero] [Opponent Monster Slots]                                        |
|                                                                                |
| [Player Hero]   [Player Monster Slots]                                          |
+--------------------------------------------------------------------------------+
| [Player Ring Row]                                                               |
| - own rings only                                                                |
| - sockets visible                                                               |
| - cooldown and energy state                                                     |
+--------------------------------------------------------------------------------+
| [Action Context]                                                                |
| - selected ring or monster                                                      |
| - legal target highlights                                                       |
| - {End Turn}                                                                    |
+--------------------------------------------------------------------------------+
```

Important difference from Dev Lab:

- The final player-facing battle screen should not display the opponent's rings unless a rule explicitly reveals them.
- Debug logs, replay import, scenario actions, and raw IDs should stay out of the main player-facing battle UI.

## Forge Hub

Purpose: choose the forge workflow.

```text
+--------------------------------------------------------------------------------+
| [Forge Actions]                                                                 |
| [Craft] [Socket] [Enchant] [Quality]                                            |
+--------------------------------------------------------------------------------+
| [Resource Summary]                                                              |
| - credits                                                                       |
| - relevant material count                                                       |
| - recent crafted/improved item                                                  |
+--------------------------------------------------------------------------------+
```

## Forge Craft

Purpose: create new rings, gems, monsters, and spells.

```text
+--------------------------------------------------------------------------------+
| [Recipe Filters]                                                                |
| {Type} {Element} {Rarity} {Craftable Only}                                      |
+--------------------------------------------------------------------------------+
| [Recipe List]                              [Selected Recipe]                    |
| - output name                             - output item preview                 |
| - type / rarity / element                 - level / quality                     |
| - can craft state                         - required materials                  |
|                                           - available stock                     |
|                                           - {Craft}                             |
+--------------------------------------------------------------------------------+
```

## Forge Socket

Purpose: manage gems inside rings.

```text
+--------------------------------------------------------------------------------+
| [Ring Selector]                                                                 |
| - owned rings                                                                   |
| - socket count                                                                  |
| - currently socketed gems                                                       |
+--------------------------------------------------------------------------------+
| [Socket Editor]                                                                 |
| [Socket 1] [Socket 2] [Socket 3]                                                 |
| - empty or gem                                                                  |
| - {Add Gem} {Remove Gem}                                                        |
+--------------------------------------------------------------------------------+
| [Available Gems]                                                                |
| - only unsocketed gems                                                          |
| - enchantment indicator                                                         |
+--------------------------------------------------------------------------------+
```

## Forge Enchant

Purpose: bind one owned spell or monster to an owned gem, replace the binding atomically, or remove
it without destroying either item.

```text
+--------------------------------------------------------------------------------+
| [Gem Selector]                       [Spell Or Monster Selector]                 |
| - owned gems                         - available enchantment items               |
| - current enchantment                - current usage state                       |
+--------------------------------------------------------------------------------+
| {Enchant} {Replace With Confirmation} {Remove Enchantment}                      |
+--------------------------------------------------------------------------------+
```

## Forge Quality

Purpose: spend credits to improve item quality.

```text
+--------------------------------------------------------------------------------+
| [Item Filters]                                                                  |
| {Type} {Rarity} {Element} {Can Improve Only}                                    |
+--------------------------------------------------------------------------------+
| [Owned Items]                               [Improvement Details]               |
| - name / type / quality                    - current quality                    |
| - current level                            - next quality                       |
| - improvement availability                 - credit cost                        |
|                                           - projected stat changes              |
|                                           - {Improve Quality}                   |
+--------------------------------------------------------------------------------+
```

The `quality`, `socket`, and `enchant` workflows remain separate because their decisions, costs, and
item eligibility are different.

## Inventory Hub

Purpose: overview of all owned resources and equipment state.

```text
+--------------------------------------------------------------------------------+
| [Inventory Summary]                                                             |
| - rings / gems / monsters / spells / materials count                            |
| - equipped rings count                                                          |
| - saved loadouts count                                                          |
+--------------------------------------------------------------------------------+
| [Shortcuts]                                                                     |
| {Items} {Materials} {Equipment} {Loadouts}                                      |
+--------------------------------------------------------------------------------+
```

## Inventory Items

Purpose: browse owned rings, gems, monsters, and spells.

```text
+--------------------------------------------------------------------------------+
| [Filters]                                                                       |
| {Type} {Rarity} {Element} {Level Range} {Search}                                |
+--------------------------------------------------------------------------------+
| [Item Grid/List]                           [Selected Item Details]              |
| - item card                               - name / type / rarity / element      |
| - level / XP / quality                    - level / XP / quality                |
| - equipped/socketed/enchant state         - base stats                          |
|                                           - resolved stats                      |
|                                           - current usage                       |
|                                           - actions: equip, socket, improve     |
+--------------------------------------------------------------------------------+
```

## Inventory Materials

Purpose: browse material stock.

```text
+--------------------------------------------------------------------------------+
| [Material Filters]                                                              |
| {Crafting Family} {Rarity} {Search}                                             |
+--------------------------------------------------------------------------------+
| [Material Grid/List]                                                            |
| - material name                                                                 |
| - quantity                                                                      |
| - rarity                                                                        |
| - crafting family                                                               |
| - chemical metadata when available                                              |
+--------------------------------------------------------------------------------+
```

## Inventory Equipment

Purpose: manage the currently equipped ring set.

```text
+--------------------------------------------------------------------------------+
| [Current Equipment]                                                             |
| - up to 10 equipped rings                                                       |
| - total speed                                                                   |
| - rough combat summary                                                          |
+--------------------------------------------------------------------------------+
| [Available Rings]                                                               |
| - owned rings not currently equipped                                            |
| - {Equip} {Unequip}                                                             |
+--------------------------------------------------------------------------------+
| [Validation]                                                                    |
| - ring count limit                                                              |
| - duplicate restrictions if any                                                 |
| - socket/enchantment readiness                                                  |
+--------------------------------------------------------------------------------+
```

## Inventory Loadouts

Purpose: save and switch equipped ring sets.

```text
+--------------------------------------------------------------------------------+
| [Saved Loadouts]                                                                |
| - loadout name                                                                  |
| - ring count                                                                    |
| - summary stats                                                                 |
| - {Activate} {Edit} {Delete}                                                    |
+--------------------------------------------------------------------------------+
| [Loadout Editor]                                                                |
| - name                                                                          |
| - selected rings                                                                |
| - available rings                                                               |
| - validation                                                                    |
| - {Save} {Set Active}                                                           |
+--------------------------------------------------------------------------------+
```

## Market Hub

Purpose: choose between game-controlled economy and player economy.

```text
+--------------------------------------------------------------------------------+
| [Market Modes]                                                                  |
| [Game Market]                         [Player Market]                          |
| - buy/sell with fixed game economy    - listings from other players             |
| - materials first                     - later economy feature                   |
+--------------------------------------------------------------------------------+
```

Recommendation:

- Implement Game Market before Player Market.
- Player Market should wait until authentication, persistence, ownership validation, listing rules, anti-abuse rules, and transaction logs exist.

## Game Market

Purpose: buy and sell against the game economy.

```text
+--------------------------------------------------------------------------------+
| [Buy Materials]                                                                 |
| - material filters                                                              |
| - unit price                                                                    |
| - quantity selector                                                             |
| - {Buy}                                                                         |
+--------------------------------------------------------------------------------+
| [Sell Items / Materials]                                                        |
| - owned resources                                                               |
| - sell price                                                                    |
| - quantity selector or selected item                                            |
| - {Sell}                                                                        |
+--------------------------------------------------------------------------------+
| [Transaction Preview]                                                           |
| - credits before/after                                                          |
| - inventory change                                                              |
+--------------------------------------------------------------------------------+
```

## Player Market

Purpose: trade player-owned items through listings.

```text
+--------------------------------------------------------------------------------+
| [Browse Listings]                                                               |
| - filters: type, rarity, element, level, quality, price                         |
| - listing cards                                                                 |
| - {Buy}                                                                         |
+--------------------------------------------------------------------------------+
| [My Listings]                                                                   |
| - listed items                                                                  |
| - price                                                                         |
| - listing status                                                                |
| - {Cancel Listing}                                                              |
+--------------------------------------------------------------------------------+
| [Create Listing]                                                                |
| - select owned unbound/unlocked item                                            |
| - set price                                                                     |
| - fee preview if any                                                            |
| - {List Item}                                                                   |
+--------------------------------------------------------------------------------+
```

MVP status: later. This feature should not be implemented before account persistence and transaction safety.

## Profile

Purpose: player identity, progression, records, and preferences.

```text
+--------------------------------------------------------------------------------+
| [Profile Overview]                                                              |
| - username                                                                      |
| - hero level / XP progress                                                      |
| - credits                                                                       |
| - account providers                                                             |
+--------------------------------------------------------------------------------+
| [Progression]                                                                   |
| - hero XP                                                                       |
| - unlocks                                                                       |
| - campaign progress                                                             |
+--------------------------------------------------------------------------------+
| [History]                                                                       |
| - recent battles                                                                |
| - result                                                                        |
| - mode                                                                          |
| - rewards                                                                       |
| - replay/action log link                                                        |
+--------------------------------------------------------------------------------+
| [Settings]                                                                      |
| - language                                                                      |
| - audio                                                                         |
| - display preferences                                                           |
| - account linking                                                               |
+--------------------------------------------------------------------------------+
```

## Recommended Implementation Order

1. Build the Game App shell and route structure.
2. Split the current dashboard into `/forge/craft`, `/inventory/items`, and `/inventory/materials`.
3. Add `/inventory/equipment` and `/inventory/loadouts`, backed by database-owned ring instances.
4. Add `/forge/socket` using the same socketing rules already proven in the Dev Lab.
5. Add `/forge/quality` using the existing quality improvement rules.
6. Add `/battle` as a mode hub with active loadout validation.
7. Add `/battle/campaign` after campaign opponent content and rewards are defined.
8. Add `/market/game` after buy/sell prices are confirmed.
9. Add `/battle/pvp/private` after server-authoritative battle state is designed.
10. Add `/market/players`, casual PvP, and ranked PvP later.

## MVP Recommendation

The first Game App milestone should include:

- Main shell.
- Home dashboard.
- Inventory items.
- Inventory materials.
- Inventory equipment.
- Inventory loadouts.
- Forge craft.
- Forge socket.
- Forge enchant.
- Forge quality.
- Battle hub with loadout validation.

Campaign can follow after this without major rework because the player-owned inventory, equipment, and loadout APIs will already exist.
