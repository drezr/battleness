# Real-World Material Collection

## Status

This document records the implemented 70-material collection derived from the historical `mats` table in `datas.db`.

The executable schema, JSON definitions, English and French locale entries, and initial prototype recipes currently ship as content version `prototype-5`. Historical SQLite recipes remain intentionally unimported because their result IDs do not match the current collectible collection.

## Source Analysis

The historical database contains:

- 70 material records.
- 23 materials described as ring-crafting materials.
- 14 materials described as spell-crafting materials.
- 17 materials described as gem-crafting materials.
- 16 materials described as monster-crafting materials.
- Four historical rarity price tiers, now mapped to 100 for common, 400 for refined, 1,600 for rare, and 6,400 for epic.
- 151 recipes that reference historical material IDs.

The collection already has a strong real-world foundation:

- Ring materials are primarily metallic chemical elements.
- Spell materials are primarily reactive nonmetals and noble gases.
- Gem materials are real gemstones, minerals, or mineraloids.
- Monster materials are industrial, geological, or biological substances.

Eight historical resources are explicitly fictional: four `bio*` materials and four `mystic*` materials. The revised collection replaces them with real substances or chemical elements.

## Recommended Material Shape

The executable schema should eventually evolve from:

```text
id, nameKey, rarity
```

to:

```text
id
nameKey
descriptionKey
rarity
craftingFamily
basePrice
realWorldType
atomicNumber?
chemicalSymbol?
```

Recommended `craftingFamily` values:

- `ring`
- `spell`
- `gem`
- `monster`

Recommended `realWorldType` values:

- `chemicalElement`
- `mineral`
- `mineraloid`
- `gemstone`
- `biomaterial`
- `industrialMaterial`
- `geologicalMaterial`
- `stateOfMatter`

`atomicNumber` and `chemicalSymbol` apply only when `realWorldType` is `chemicalElement`.

## Rarity And Price

Rarity remains a gameplay property rather than a strict scientific abundance ranking. It considers natural abundance, extraction difficulty, processing complexity, danger, and intended recipe progression.

| Rarity  | Base price |
| ------- | ---------: |
| Common  |        100 |
| Refined |        400 |
| Rare    |      1,600 |
| Epic    |      6,400 |

The four-times price progression from the historical database is preserved.

## Ring-Crafting Materials

These 23 materials preserve the historical metal-focused ring family.

| ID          | English   | French    | Rarity  | Price | Symbol | Atomic number | Historical change                 |
| ----------- | --------- | --------- | ------- | ----: | ------ | ------------: | --------------------------------- |
| `aluminium` | Aluminium | Aluminium | Common  |   100 | Al     |            13 | Preserved                         |
| `iron`      | Iron      | Fer       | Common  |   100 | Fe     |            26 | Preserved                         |
| `sodium`    | Sodium    | Sodium    | Common  |   100 | Na     |            11 | Preserved                         |
| `magnesium` | Magnesium | Magnésium | Common  |   100 | Mg     |            12 | Preserved                         |
| `manganese` | Manganese | Manganèse | Common  |   100 | Mn     |            25 | Preserved                         |
| `calcium`   | Calcium   | Calcium   | Common  |   100 | Ca     |            20 | Preserved                         |
| `copper`    | Copper    | Cuivre    | Common  |   100 | Cu     |            29 | Moved from historical magic tier  |
| `titanium`  | Titanium  | Titane    | Refined |   400 | Ti     |            22 | Moved from historical normal tier |
| `chromium`  | Chromium  | Chrome    | Refined |   400 | Cr     |            24 | Preserved                         |
| `zinc`      | Zinc      | Zinc      | Refined |   400 | Zn     |            30 | Preserved                         |
| `nickel`    | Nickel    | Nickel    | Refined |   400 | Ni     |            28 | Preserved                         |
| `cobalt`    | Cobalt    | Cobalt    | Refined |   400 | Co     |            27 | Preserved                         |
| `lead`      | Lead      | Plomb     | Refined |   400 | Pb     |            82 | Preserved                         |
| `silver`    | Silver    | Argent    | Rare    | 1,600 | Ag     |            47 | Preserved                         |
| `mercury`   | Mercury   | Mercure   | Rare    | 1,600 | Hg     |            80 | Preserved                         |
| `gold`      | Gold      | Or        | Rare    | 1,600 | Au     |            79 | Preserved                         |
| `platinum`  | Platinum  | Platine   | Rare    | 1,600 | Pt     |            78 | Corrects `platinium`              |
| `tungsten`  | Tungsten  | Tungstène | Rare    | 1,600 | W      |            74 | Preserved                         |
| `uranium`   | Uranium   | Uranium   | Rare    | 1,600 | U      |            92 | Moved from epic                   |
| `iridium`   | Iridium   | Iridium   | Epic    | 6,400 | Ir     |            77 | Moved from rare                   |
| `plutonium` | Plutonium | Plutonium | Epic    | 6,400 | Pu     |            94 | Preserved                         |
| `neptunium` | Neptunium | Neptunium | Epic    | 6,400 | Np     |            93 | Preserved                         |
| `radium`    | Radium    | Radium    | Epic    | 6,400 | Ra     |            88 | Preserved                         |

## Spell-Crafting Materials

These 14 materials use real reactive nonmetals, halogens, and noble gases.

| ID         | English  | French    | Rarity  | Price | Symbol | Atomic number | Historical change       |
| ---------- | -------- | --------- | ------- | ----: | ------ | ------------: | ----------------------- |
| `hydrogen` | Hydrogen | Hydrogène | Common  |   100 | H      |             1 | Preserved               |
| `oxygen`   | Oxygen   | Oxygène   | Common  |   100 | O      |             8 | Preserved               |
| `nitrogen` | Nitrogen | Azote     | Common  |   100 | N      |             7 | Preserved               |
| `helium`   | Helium   | Hélium    | Common  |   100 | He     |             2 | Preserved               |
| `chlorine` | Chlorine | Chlore    | Refined |   400 | Cl     |            17 | Preserved               |
| `fluorine` | Fluorine | Fluor     | Refined |   400 | F      |             9 | Preserved               |
| `bromine`  | Bromine  | Brome     | Refined |   400 | Br     |            35 | Replaces `mysticpulse`  |
| `neon`     | Neon     | Néon      | Rare    | 1,600 | Ne     |            10 | Preserved               |
| `argon`    | Argon    | Argon     | Rare    | 1,600 | Ar     |            18 | Preserved               |
| `iodine`   | Iodine   | Iode      | Rare    | 1,600 | I      |            53 | Replaces `mysticfuel`   |
| `krypton`  | Krypton  | Krypton   | Epic    | 6,400 | Kr     |            36 | Preserved               |
| `xenon`    | Xenon    | Xénon     | Epic    | 6,400 | Xe     |            54 | Preserved               |
| `radon`    | Radon    | Radon     | Epic    | 6,400 | Rn     |            86 | Replaces `mysticenergy` |
| `astatine` | Astatine | Astate    | Epic    | 6,400 | At     |            85 | Replaces `mysticpower`  |

## Gem-Crafting Materials

These 17 materials preserve the historical gemstone and mineral family. They are real materials but are not chemical elements, except that diamond is a crystalline allotrope of carbon.

| ID            | English     | French           | Rarity  | Price | Real-world basis           | Historical change       |
| ------------- | ----------- | ---------------- | ------- | ----: | -------------------------- | ----------------------- |
| `pearl`       | Pearl       | Perle            | Common  |   100 | Biogenic gemstone          | Preserved               |
| `amethyst`    | Amethyst    | Améthyste        | Common  |   100 | Quartz variety             | Preserved               |
| `chromite`    | Chromite    | Chromite         | Common  |   100 | Oxide mineral              | Preserved               |
| `topaz`       | Topaz       | Topaze           | Common  |   100 | Silicate mineral           | Preserved               |
| `turquoise`   | Turquoise   | Turquoise        | Common  |   100 | Phosphate mineral          | Preserved               |
| `citrine`     | Citrine     | Citrine          | Refined |   400 | Quartz variety             | Preserved               |
| `azurite`     | Azurite     | Azurite          | Refined |   400 | Carbonate mineral          | Preserved               |
| `moonstone`   | Moonstone   | Pierre de lune   | Refined |   400 | Feldspar variety           | Preserved               |
| `sunstone`    | Sunstone    | Pierre de soleil | Refined |   400 | Feldspar variety           | Preserved               |
| `opal`        | Opal        | Opale            | Refined |   400 | Mineraloid                 | Preserved               |
| `sapphire`    | Sapphire    | Saphir           | Rare    | 1,600 | Corundum variety           | Preserved               |
| `ruby`        | Ruby        | Rubis            | Rare    | 1,600 | Corundum variety           | Preserved               |
| `emerald`     | Emerald     | Émeraude         | Rare    | 1,600 | Beryl variety              | Preserved               |
| `diamond`     | Diamond     | Diamant          | Rare    | 1,600 | Crystalline carbon         | Preserved               |
| `redDiamond`  | Red Diamond | Diamant rouge    | Epic    | 6,400 | Rare diamond color variety | Commonizes `reddiamond` |
| `blackOpal`   | Black Opal  | Opale noire      | Epic    | 6,400 | Dark opal variety          | Commonizes `blackopal`  |
| `alexandrite` | Alexandrite | Alexandrite      | Epic    | 6,400 | Chrysoberyl variety        | Preserved               |

## Monster-Crafting Materials

These 16 materials use real geological, industrial, biological, or high-energy substances.

| ID           | English    | French     | Rarity  | Price | Real-world type                        | Historical change                 |
| ------------ | ---------- | ---------- | ------- | ----: | -------------------------------------- | --------------------------------- |
| `sand`       | Sand       | Sable      | Common  |   100 | Geological material                    | Preserved                         |
| `wax`        | Wax        | Cire       | Common  |   100 | Biomaterial                            | Preserved                         |
| `rubber`     | Rubber     | Caoutchouc | Common  |   100 | Polymer                                | Preserved                         |
| `coal`       | Coal       | Charbon    | Common  |   100 | Organic sedimentary rock               | Moved from historical magic tier  |
| `cellulose`  | Cellulose  | Cellulose  | Common  |   100 | Biopolymer                             | Replaces `biopulse`               |
| `oil`        | Oil        | Pétrole    | Refined |   400 | Petroleum mixture                      | Moved from historical normal tier |
| `carbon`     | Carbon     | Carbone    | Refined |   400 | Chemical element, C, atomic number 6   | Preserved                         |
| `ink`        | Ink        | Encre      | Refined |   400 | Industrial mixture                     | Preserved                         |
| `silk`       | Silk       | Soie       | Refined |   400 | Protein fiber                          | Preserved                         |
| `keratin`    | Keratin    | Kératine   | Refined |   400 | Structural protein                     | Replaces `biofuel`                |
| `silicon`    | Silicon    | Silicium   | Rare    | 1,600 | Chemical element, Si, atomic number 14 | Preserved                         |
| `sulfur`     | Sulfur     | Soufre     | Rare    | 1,600 | Chemical element, S, atomic number 16  | Moved from epic                   |
| `phosphorus` | Phosphorus | Phosphore  | Rare    | 1,600 | Chemical element, P, atomic number 15  | Moved from epic                   |
| `chitin`     | Chitin     | Chitine    | Rare    | 1,600 | Biopolymer                             | Replaces `bioenergy`              |
| `plasma`     | Plasma     | Plasma     | Epic    | 6,400 | State of matter                        | Moved from rare                   |
| `graphene`   | Graphene   | Graphène   | Epic    | 6,400 | Carbon allotrope                       | Replaces `biopower`               |

## Historical ID Migration

The 151 historical recipes can be retained after applying these ID migrations:

| Historical ID  | Proposed ID  | Reason                                                   |
| -------------- | ------------ | -------------------------------------------------------- |
| `platinium`    | `platinum`   | Correct English spelling                                 |
| `reddiamond`   | `redDiamond` | Project camelCase convention                             |
| `blackopal`    | `blackOpal`  | Project camelCase convention                             |
| `biopulse`     | `cellulose`  | Replace fictional resource with a real biomaterial       |
| `biofuel`      | `keratin`    | Replace fictional resource with a real biomaterial       |
| `bioenergy`    | `chitin`     | Replace fictional resource with a real biomaterial       |
| `biopower`     | `graphene`   | Replace fictional resource with a real advanced material |
| `mysticpulse`  | `bromine`    | Replace fictional resource with a real chemical element  |
| `mysticfuel`   | `iodine`     | Replace fictional resource with a real chemical element  |
| `mysticenergy` | `radon`      | Replace fictional resource with a real chemical element  |
| `mysticpower`  | `astatine`   | Replace fictional resource with a real chemical element  |

Recipe results should be reviewed separately because the historical result IDs do not match the new proposed ring, gem, monster, and spell collection.

## Scientific Reference Policy

- Chemical element names, symbols, and atomic numbers should follow the IUPAC periodic table.
- Material descriptions should remain concise and factual.
- Gameplay rarity should not claim to represent exact natural abundance.
- Hazardous or radioactive materials may exist as fictional inventory objects, but descriptions should not provide handling or extraction instructions.

Reference sources:

- IUPAC Periodic Table of the Elements: https://iupac.org/wp-content/uploads/2022/07/IUPAC_Periodic_Table-04May22_CRA.pdf
- Royal Society of Chemistry Periodic Table: https://periodic-table.rsc.org/

## Implementation Status

- All 70 material slots are implemented.
- Material definitions include `craftingFamily`, `basePrice`, `realWorldType`, and optional atomic metadata.
- The historical four-times rarity price progression is enforced by validation.
- Rarities use `common`, `refined`, `rare`, and `epic`.
- The eight fictional `bio*` and `mystic*` materials are replaced.
- The current prototype has 48 newly defined recipes for collectible rings, gems, monsters, and spells.
- Historical recipe migrations are documented but not imported.
