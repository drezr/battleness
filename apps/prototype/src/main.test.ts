// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("battle board interactions", () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    await import("./main");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("prepares a ring and uses it on a board target", () => {
    startBattle("basicRingAttack");

    const selector = '[data-board-ring-id="playerOne.ring.staticLoop"]';
    advanceUntilEnabled(selector);
    const ring = getButton(selector);
    ring.click();

    expect(ringAfterRender("playerOne.ring.staticLoop").classList).toContain("selected");
    expect(getElement(".board-action-hint").textContent).toContain("Static Loop prepared");

    getButton('[data-board-target-id="playerTwo.hero"]').click();

    expect(ringAfterRender("playerOne.ring.staticLoop").classList).not.toContain("selected");
    expect(eventTypes()).toContain("ringUsed");
  });

  it("renders rarity classes on rings, gems, and monsters", () => {
    startBattle("basicRingAttack");

    expect(ringAfterRender("playerOne.ring.staticLoop").classList).toContain("rarity-common");
    expect(ringAfterRender("playerTwo.ring.ionSignet").classList).toContain("rarity-refined");
    expect(getElement('[title="Static Pearl - Electric"]').classList).toContain("rarity-common");
    expect(
      getElement('[data-board-ring-id="playerOne.ring.staticLoop"] .element-badge').textContent,
    ).toBe("Electric");
  });

  it("renders artwork for every current content definition in the setup collection", () => {
    const assets = document.querySelectorAll<HTMLElement>("[data-asset-kind][data-asset-id]");

    expect(assets).toHaveLength(253);
    expect(
      getElement('[data-asset-kind="ring"][data-asset-id="ashenLoop"] .item-artwork').getAttribute(
        "style",
      ),
    ).toContain("/assets/items/rings.png");
    expect(
      getElement(
        '[data-asset-kind="material"][data-asset-id="graphene"] .item-artwork',
      ).getAttribute("style"),
    ).toContain("/assets/items/materials-atlas.png");
  });

  it("shows the content balance report in the setup screen", () => {
    const report = getElement(".content-balance-report");

    expect(report.textContent).toContain("Content balance report");
    expect(report.textContent).toContain("Base");
    expect(report.textContent).toContain("Mid");
    expect(report.textContent).toContain("Max");
    expect(report.textContent).toContain("Ashen Loop");
    expect(report.textContent).toContain("damage/energy");
    expect(document.querySelectorAll(".balance-report-group")).toHaveLength(4);
  });

  it("builds and starts a battle from an edited Battle Lab loadout", () => {
    selectValue("#setupMode", "battleLab");

    expect(getElement(".battle-lab-editor")).toBeTruthy();

    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="definitionId"]',
      "crownOfMaelgor",
    );
    getButton('[data-lab-add-gem="0:0"]').click();

    expect(
      document.querySelectorAll(
        '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-gem-field="definitionId"]',
      ),
    ).toHaveLength(2);

    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-gem-index="1"][data-lab-enchantment-field="type"]',
      "monster",
    );
    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-gem-index="1"][data-lab-enchantment-field="definitionId"]',
      "azhurath",
    );

    getButton("#startBattle").click();

    const ring = getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]');
    expect(ring.textContent).toContain("Crown of Maelgor");
    expect(ring.querySelector(".ring-artwork")?.getAttribute("style")).toContain(
      "/assets/items/rings.png",
    );
  });

  it("saves, restores, exports, and imports Battle Lab loadouts", () => {
    selectValue("#setupMode", "battleLab");

    const presetName = getInput("#battleLabPresetName");
    presetName.value = "Electric test";
    getButton("#saveBattleLabPreset").click();

    expect(getElement(".lab-feedback").textContent).toContain("Electric test saved");

    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="definitionId"]',
      "crownOfMaelgor",
    );
    getButton("#loadBattleLabPreset").click();

    expect(getElement(".lab-feedback").textContent).toContain("Electric test loaded");
    const restoredRingSelect = getSelect(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="definitionId"]',
    );
    expect(
      Array.from(restoredRingSelect.options).find((option) => option.hasAttribute("selected"))
        ?.value,
    ).toBe("staticLoop");

    getButton("#exportBattleLab").click();
    const json = getTextarea("#battleLabJson");
    const importedConfig = JSON.parse(json.value) as {
      players: [{ username: string }, { username: string }];
    };
    importedConfig.players[0].username = "Imported Player";
    json.value = JSON.stringify(importedConfig);
    getButton("#importBattleLab").click();

    expect(getInput('[data-lab-player-index="0"][data-lab-player-field="username"]').value).toBe(
      "Imported Player",
    );

    getTextarea("#battleLabJson").value = "{broken";
    getButton("#importBattleLab").click();
    expect(getElement(".lab-feedback.error").textContent).toContain("not valid JSON");
  });

  it("shows resolved Battle Lab comparison metrics", () => {
    selectValue("#setupMode", "battleLab");

    expect(getElement(".balance-comparison").textContent).toContain("Damage per energy");
    expect(getElement(".balance-comparison").textContent).toContain("Damage per cooldown");
    expect(document.querySelectorAll(".balance-player-grid > article")).toHaveLength(2);

    getButton("#runBattleLabBatch").click();

    expect(document.querySelectorAll(".simulation-table tbody tr")).toHaveLength(2);
    expect(getElement(".simulation-table").textContent).toContain("wins");
  });

  it("crafts an item through the development forge", () => {
    expect(getElement(".forge-panel").textContent).toContain("Ashen Loop - Ring");

    getButton("#craftSelectedRecipe").click();

    expect(getElement(".crafted-items").textContent).toContain("Ashen Loop");
    expect(getElement(".crafted-items").textContent).toContain(
      "forgePlayer.ring.ashenLoop.crafted.1",
    );
    expect(getElement(".forge-ingredients").textContent).toContain("0/3");
    expect(localStorage.getItem("battleness.developmentInventory.v2")).toContain(
      "forgePlayer.ring.ashenLoop.crafted.1",
    );

    getButton("#exportDevelopmentInventory").click();
    const inventoryJson = getTextarea("#forgeInventoryJson");
    const inventory = JSON.parse(inventoryJson.value) as {
      stock: Record<string, number>;
      craftedItems: unknown[];
      nextSequence: number;
    };
    inventory.stock.aluminium = 0;
    inventory.craftedItems = [];
    inventory.nextSequence = 3;
    inventoryJson.value = JSON.stringify(inventory);
    getButton("#importDevelopmentInventory").click();

    expect(getElement(".crafted-items").textContent).toContain("No crafted items yet");
    expect(getButton("#craftSelectedRecipe").disabled).toBe(true);

    getButton("#resetDevelopmentInventory").click();

    expect(getButton("#craftSelectedRecipe").disabled).toBe(false);

    getButton('[data-forge-stock-material="aluminium"][data-forge-stock-delta="-1"]').click();
    getButton('[data-forge-stock-material="aluminium"][data-forge-stock-delta="-1"]').click();

    expect(getButton("#craftSelectedRecipe").disabled).toBe(true);
  });

  it("renders a complete development inventory view with filters", () => {
    expect(document.querySelectorAll(".material-stock-card")).toHaveLength(70);
    expect(getElement('[data-inventory-material-id="aluminium"]').textContent).toContain(
      "Quantity: 3",
    );

    getButton("#craftSelectedRecipe").click();

    expect(getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]')).toBeTruthy();
    expect(getElement('[data-inventory-material-id="aluminium"]').textContent).toContain(
      "Quantity: 0",
    );

    selectValue("#inventoryTypeFilter", "gem");

    expect(document.querySelector('[data-inventory-kind="ring"]')).toBeNull();
    expect(getElement(".development-inventory").textContent).toContain("No crafted items yet");

    selectValue("#inventoryTypeFilter", "all");
    selectValue("#inventoryElementFilter", "fire");

    expect(getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]')).toBeTruthy();

    selectValue("#inventoryElementFilter", "ice");

    expect(
      document.querySelector('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]'),
    ).toBeNull();
  });

  it("improves crafted inventory quality and ring sockets", () => {
    getButton("#craftSelectedRecipe").click();

    expect(getElement(".inventory-summary").textContent).toContain("1000");
    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Quality: 0");

    getButton(
      '[data-improve-quality-type="ring"][data-improve-quality-id="forgePlayer.ring.ashenLoop.crafted.1"]',
    ).click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Quality: 5");
    expect(getElement(".development-inventory").textContent).toContain("975");

    getButton('[data-improve-sockets-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]').click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Sockets: 2");
    expect(localStorage.getItem("battleness.developmentInventory.v2")).toContain(
      '"socketCount": 2',
    );

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");
    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.ashenLoop.crafted.1",
    );

    expect(
      getInput(
        '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="quality"]',
      ).value,
    ).toBe("5");
    expect(getElement(".battle-lab-editor").textContent).toContain("Sockets");
  });

  it("uses crafted development inventory instances in Battle Lab", () => {
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftGemEmberShard");
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
    getButton("#craftSelectedRecipe").click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.emberShard.crafted.2"]').click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Ember Shard");
    expect(
      getElement('[data-inventory-id="forgePlayer.gem.emberShard.crafted.2"]').textContent,
    ).toContain("Spell: Firebolt");

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");

    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.ashenLoop.crafted.1",
    );

    expect(
      getInput('[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="level"]')
        .disabled,
    ).toBe(true);
    expect(getElement(".battle-lab-editor").textContent).toContain("Sockets");
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.gem.emberShard.crafted.2",
    );
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.spell.firebolt.crafted.3",
    );

    getButton("#startBattle").click();

    expect(getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]').textContent).toContain(
      "Ashen Loop",
    );
  });

  it("builds a saved development loadout and sends it to Battle Lab", () => {
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftGemEmberShard");
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
    getButton("#craftSelectedRecipe").click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.emberShard.crafted.2"]').click();

    const loadoutRing = getInput('[data-loadout-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]');
    loadoutRing.checked = true;
    loadoutRing.dispatchEvent(new Event("change"));

    expect(getElement(".loadout-builder").textContent).toContain("Selected rings");
    expect(getElement(".loadout-builder").textContent).toContain("Ember Shard");

    const loadoutName = getInput("#developmentLoadoutName");
    loadoutName.value = "Fire starter";
    getButton("#saveDevelopmentLoadout").click();

    expect(localStorage.getItem("battleness.developmentLoadouts.v2")).toContain("Fire starter");

    const selectedLoadoutRing = getInput(
      '[data-loadout-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]',
    );
    selectedLoadoutRing.checked = false;
    selectedLoadoutRing.dispatchEvent(new Event("change"));
    getButton("#loadDevelopmentLoadout").click();

    expect(getInput('[data-loadout-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]').checked).toBe(
      true,
    );

    getButton("#sendLoadoutToPlayerOne").click();

    expect(getSelect("#battleLabItemSourceMode").value).toBe("inventory");
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.ring.ashenLoop.crafted.1",
    );
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.gem.emberShard.crafted.2",
    );
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.spell.firebolt.crafted.3",
    );

    getButton("#startBattle").click();

    expect(getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]').textContent).toContain(
      "Ashen Loop",
    );
  });

  it("runs the full starter development loop from craft to battle rewards", () => {
    craftStarterRingGemAndSpell();

    getButton(
      '[data-improve-quality-type="ring"][data-improve-quality-id="forgePlayer.ring.ashenLoop.crafted.1"]',
    ).click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.emberShard.crafted.2"]').click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Quality: 5");
    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Ember Shard");
    expect(
      getElement('[data-inventory-id="forgePlayer.gem.emberShard.crafted.2"]').textContent,
    ).toContain("Spell: Firebolt");

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");
    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.ashenLoop.crafted.1",
    );

    expect(
      getInput(
        '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="quality"]',
      ).value,
    ).toBe("5");
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.spell.firebolt.crafted.3",
    );

    getButton("#startBattle").click();
    useLabPlayerOneStarterRingOnHero();
    getButton("#manualConcede").click();

    expect(getElement(".battle-result-summary").textContent).toContain("Ashen Loop");
    expect(getElement(".battle-result-summary").textContent).toContain("Firebolt");
    expect(getElement(".battle-rewards").textContent).toContain("Ashen Loop +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Ember Shard +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Firebolt +28 XP");

    getButton("#claimBattleRewards").click();

    const persistedInventory = localStorage.getItem("battleness.developmentInventory.v2") ?? "";
    expect(persistedInventory).toContain('"credits": 1125');
    expect(persistedInventory).toContain('"aluminium": 1');

    getButton("#backToSetup").click();

    expect(getElement(".inventory-summary").textContent).toContain("1125");
    expect(getElement('[data-inventory-material-id="aluminium"]').textContent).toContain(
      "Quantity: 1",
    );
    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("XP 128/400");
    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("Quality: 5");
  });

  it("renders rare monster borders on the battle board", () => {
    startBattle("skillShowcase");

    expect(
      getButton('[data-board-monster-id="playerTwo.monster.shieldWisp.1"]').classList,
    ).toContain("rarity-refined");
    expect(
      getElement('[data-board-monster-id="playerTwo.monster.shieldWisp.1"] .element-badge')
        .textContent,
    ).toBe("Ice");
  });

  it("claims deterministic battle rewards into the development inventory", () => {
    startBattle("basicRingAttack");

    getButton("#manualConcede").click();

    expect(getElement(".battle-result-summary").textContent).toContain("Battle result summary");
    expect(getElement(".battle-result-summary").textContent).toContain(
      "Player Two defeated Player One.",
    );
    expect(getElement(".battle-result-summary").textContent).toContain("Damage by player");
    expect(getElement(".battle-result-summary").textContent).toContain("Unclaimed");
    expect(getElement(".battle-rewards").textContent).toContain("Battle rewards");
    expect(getElement(".battle-rewards").textContent).toContain("+150");
    expect(getElement(".battle-rewards").textContent).toContain("Aluminium x1");
    expect(getElement(".battle-rewards").textContent).toContain(
      "No source-backed inventory items in this battle.",
    );

    getButton("#claimBattleRewards").click();

    expect(getButton("#claimBattleRewards").disabled).toBe(true);
    expect(getButton("#claimBattleRewards").textContent).toContain("Rewards claimed");
    expect(getElement(".battle-result-summary").textContent).toContain("Rewards claimed");
    expect(localStorage.getItem("battleness.developmentInventory.v2")).toContain('"credits": 1150');
    expect(localStorage.getItem("battleness.developmentInventory.v2")).toContain('"aluminium": 4');

    getButton("#backToSetup").click();

    expect(getElement('[data-inventory-material-id="aluminium"]').textContent).toContain(
      "Quantity: 4",
    );
    expect(getElement(".inventory-summary").textContent).toContain("1150");
  });

  it("claims cumulative item XP for equipped and used development inventory items", () => {
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftGemEmberShard");
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
    getButton("#craftSelectedRecipe").click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.ashenLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.emberShard.crafted.2"]').click();

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");
    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.ashenLoop.crafted.1",
    );
    getButton("#startBattle").click();

    for (
      let turn = 0;
      turn < 6 && getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]').disabled;
      turn += 1
    ) {
      getButton("#boardEndTurn").click();
    }
    getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]').click();
    getButton('[data-board-target-id="labPlayerTwo.hero"]').click();
    getButton("#manualConcede").click();

    expect(getElement(".battle-result-summary").textContent).toContain("Rings used");
    expect(getElement(".battle-result-summary").textContent).toContain("Ashen Loop");
    expect(getElement(".battle-result-summary").textContent).toContain("Spells cast");
    expect(getElement(".battle-result-summary").textContent).toContain("Firebolt");
    expect(getElement(".battle-result-summary").textContent).toContain("Item XP generated");
    expect(getElement(".battle-result-summary").textContent).toContain("Ashen Loop +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Ashen Loop +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Ember Shard +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Firebolt +28 XP");

    getButton("#claimBattleRewards").click();

    const inventory = JSON.parse(
      localStorage.getItem("battleness.developmentInventory.v2") ?? "{}",
    ) as {
      craftedItems: Array<{
        item: {
          id: string;
          experience: number;
        };
      }>;
    };

    expect(
      inventory.craftedItems.find(
        (crafted) => crafted.item.id === "forgePlayer.ring.ashenLoop.crafted.1",
      )?.item.experience,
    ).toBe(128);
    expect(
      inventory.craftedItems.find(
        (crafted) => crafted.item.id === "forgePlayer.gem.emberShard.crafted.2",
      )?.item.experience,
    ).toBe(128);
    expect(
      inventory.craftedItems.find(
        (crafted) => crafted.item.id === "forgePlayer.spell.firebolt.crafted.3",
      )?.item.experience,
    ).toBe(128);

    getButton("#backToSetup").click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.ashenLoop.crafted.1"]').textContent,
    ).toContain("XP 128/400");
    expect(
      getElement('[data-inventory-id="forgePlayer.gem.emberShard.crafted.2"]').textContent,
    ).toContain("XP 128/400");
    expect(
      getElement('[data-inventory-id="forgePlayer.spell.firebolt.crafted.3"]').textContent,
    ).toContain("XP 128/400");
  });

  it("blocks non-Taunt enemy targets after a Taunt monster is summoned", () => {
    summonIceGuardian();
    getButton("#boardEndTurn").click();

    expect(getButton('[data-board-target-id="playerOne.hero"]').disabled).toBe(true);
    expect(getButton('[data-board-monster-id="playerOne.monster.iceGuardian.1"]').disabled).toBe(
      false,
    );
  });

  it("uses a summoned monster from the board on its next ready turn", () => {
    summonIceGuardian();
    getButton("#boardEndTurn").click();
    getButton("#boardEndTurn").click();

    const monsterSelector = '[data-board-monster-id="playerOne.monster.iceGuardian.1"]';
    const monster = getButton(monsterSelector);

    expect(monster.disabled).toBe(false);
    expect(monster.textContent).toContain("Cooldown 0/1");

    monster.click();

    expect(getButton(monsterSelector).classList).toContain("prepared");
    expect(getElement(".board-action-hint").textContent).toContain("Ice Guardian prepared");

    getButton('[data-board-target-id="playerTwo.hero"]').click();

    expect(eventTypes()).toContain("monsterUsed");
    expect(getButton(monsterSelector).textContent).toContain("Cooldown 1/1");
  });

  it("shows a summoned Haste monster as immediately ready", () => {
    startBattle("basicRingAttack");
    const selector = '[data-board-ring-id="playerTwo.ring.rimeLoop"]';
    advanceUntilEnabled(selector);
    getButton(selector).click();
    getButton('[data-board-target-id="playerTwo.hero"]').click();

    const monster = getButton('[data-board-monster-id="playerTwo.monster.stormHound.1"]');
    expect(monster.disabled).toBe(false);
    expect(monster.textContent).toContain("Haste");
    expect(monster.textContent).toContain("Cooldown 0/1");
    expect(eventTypes()).toContain("hasteActivated");
  });

  it("runs the skill showcase through MultiHit, Shield, Rage, and Pierce", () => {
    startBattle("skillShowcase");
    getButton("#boardEndTurn").click();
    getButton("#boardEndTurn").click();

    useBoardMonster("playerOne.monster.galvanMantis.1", "playerTwo.monster.iceGuardian.1");

    expect(
      getButton('[data-board-monster-id="playerTwo.monster.shieldWisp.1"]').textContent,
    ).toContain("Shield - Broken");
    expect(
      getButton('[data-board-monster-id="playerTwo.monster.cinderJackal.1"]').textContent,
    ).toContain("Rage - Active");

    useBoardMonster("playerOne.monster.stormHound.1", "playerTwo.monster.iceGuardian.1");
    useBoardMonster("playerOne.monster.ashling.1", "playerTwo.monster.iceGuardian.1");

    expect(eventTypes()).toEqual(
      expect.arrayContaining([
        "multiHitResolved",
        "shieldBroken",
        "rageActivated",
        "pierceOverflow",
      ]),
    );
  });

  it("exports, imports, and replays recorded actions step by step", () => {
    startBattle("basicRingAttack");
    getButton("#boardEndTurn").click();
    getButton("#boardEndTurn").click();
    getButton("#exportBattleRecord").click();

    const recordText = getElement<HTMLTextAreaElement>("#battleRecordText").value;
    const record = JSON.parse(recordText) as {
      format: string;
      actions: Array<{ type: string; playerId: string }>;
    };
    expect(record.format).toBe("battlenessBattleRecord");
    expect(record.actions).toEqual([
      { type: "endTurn", playerId: "playerOne" },
      { type: "endTurn", playerId: "playerTwo" },
    ]);

    getButton("#importBattleRecord").click();

    expect(getElement(".replay-panel .muted").textContent).toContain("0/2");
    expect(getButton("#boardEndTurn").disabled).toBe(true);

    getButton("#replayNextAction").click();
    expect(getElement(".replay-panel .muted").textContent).toContain("1/2");
    expect(getButton("#boardEndTurn").disabled).toBe(true);

    getButton("#replayAllActions").click();
    expect(getElement(".replay-panel .muted").textContent).toContain("2/2");
    expect(getButton("#boardEndTurn").disabled).toBe(false);
    expect(eventTypes().filter((eventType) => eventType === "turnEnded")).toHaveLength(2);
  });
});

function startBattle(scenarioId: string): void {
  const scenario = getElement<HTMLSelectElement>("#scenarioSelect");
  scenario.value = scenarioId;
  scenario.dispatchEvent(new Event("change", { bubbles: true }));
  getButton("#startBattle").click();
}

function summonIceGuardian(): void {
  startBattle("summonAndTaunt");
  const selector = '[data-board-ring-id="playerOne.ring.staticLoop"]';
  advanceUntilEnabled(selector);
  getButton(selector).click();
  getButton('[data-board-target-id="playerTwo.hero"]').click();
}

function advanceUntilEnabled(selector: string, maxTurns = 10): void {
  for (let turn = 0; turn < maxTurns && getButton(selector).disabled; turn += 1) {
    getButton("#boardEndTurn").click();
  }
}

function useBoardMonster(monsterInstanceId: string, targetId: string): void {
  getButton(`[data-board-monster-id="${monsterInstanceId}"]`).click();
  getButton(`[data-board-target-id="${targetId}"]`).click();
}

function craftStarterRingGemAndSpell(): void {
  getButton("#craftSelectedRecipe").click();
  selectValue("#forgeRecipeSelect", "craftGemEmberShard");
  getButton("#craftSelectedRecipe").click();
  selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
  getButton("#craftSelectedRecipe").click();
}

function useLabPlayerOneStarterRingOnHero(): void {
  const ringSelector = '[data-board-ring-id="labPlayerOne.lab.ring.1"]';
  for (let turn = 0; turn < 6 && getButton(ringSelector).disabled; turn += 1) {
    getButton("#boardEndTurn").click();
  }

  getButton(ringSelector).click();
  getButton('[data-board-target-id="labPlayerTwo.hero"]').click();
}

function ringAfterRender(ringInstanceId: string): HTMLButtonElement {
  return getButton(`[data-board-ring-id="${ringInstanceId}"]`);
}

function eventTypes(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".event-item code")).map(
    (element) => element.textContent ?? "",
  );
}

function getButton(selector: string): HTMLButtonElement {
  return getElement<HTMLButtonElement>(selector);
}

function getInput(selector: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) {
    throw new Error(`Expected input ${selector} to exist.`);
  }
  return input;
}

function getSelect(selector: string): HTMLSelectElement {
  const select = document.querySelector<HTMLSelectElement>(selector);
  if (!select) {
    throw new Error(`Expected select ${selector} to exist.`);
  }
  return select;
}

function getTextarea(selector: string): HTMLTextAreaElement {
  const textarea = document.querySelector<HTMLTextAreaElement>(selector);
  if (!textarea) {
    throw new Error(`Expected textarea ${selector} to exist.`);
  }
  return textarea;
}

function selectValue(selector: string, value: string): void {
  const select = getSelect(selector);
  select.value = value;
  select.dispatchEvent(new Event("change"));
}

function getElement<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Expected element matching ${selector}.`);
  }

  return element;
}
