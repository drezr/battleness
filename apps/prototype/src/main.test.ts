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

    const ring = getButton('[data-board-ring-id="playerOne.ring.sparkBand"]');
    ring.click();

    expect(ringAfterRender("playerOne.ring.sparkBand").classList).toContain("selected");
    expect(getElement(".board-action-hint").textContent).toContain("Spark Band prepared");

    getButton('[data-board-target-id="playerTwo.hero"]').click();

    expect(ringAfterRender("playerOne.ring.sparkBand").classList).not.toContain("selected");
    expect(eventTypes()).toContain("ringUsed");
  });

  it("renders rarity classes on rings, gems, and monsters", () => {
    startBattle("basicRingAttack");

    expect(ringAfterRender("playerOne.ring.sparkBand").classList).toContain("rarity-common");
    expect(ringAfterRender("playerTwo.ring.ironCircle").classList).toContain("rarity-refined");
    expect(getElement('[title="Static Pearl - Electric"]').classList).toContain("rarity-refined");
    expect(
      getElement('[data-board-ring-id="playerOne.ring.sparkBand"] .element-badge').textContent,
    ).toBe("Electric");
  });

  it("renders artwork for every current content definition in the setup collection", () => {
    const assets = document.querySelectorAll<HTMLElement>("[data-asset-kind][data-asset-id]");

    expect(assets).toHaveLength(120);
    expect(
      getElement('[data-asset-kind="ring"][data-asset-id="emberLoop"] .item-artwork').getAttribute(
        "style",
      ),
    ).toContain("/assets/items/rings-atlas.png");
    expect(
      getElement(
        '[data-asset-kind="material"][data-asset-id="graphene"] .item-artwork',
      ).getAttribute("style"),
    ).toContain("/assets/items/materials-atlas.png");
  });

  it("builds and starts a battle from an edited Battle Lab loadout", () => {
    selectValue("#setupMode", "battleLab");

    expect(getElement(".battle-lab-editor")).toBeTruthy();

    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="definitionId"]',
      "solarCrown",
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
      "solarDrake",
    );

    getButton("#startBattle").click();

    const ring = getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]');
    expect(ring.textContent).toContain("Solar Crown");
    expect(ring.querySelector(".ring-artwork")?.getAttribute("style")).toContain(
      "/assets/items/rings-atlas.png",
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
      "solarCrown",
    );
    getButton("#loadBattleLabPreset").click();

    expect(getElement(".lab-feedback").textContent).toContain("Electric test loaded");
    const restoredRingSelect = getSelect(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="definitionId"]',
    );
    expect(
      Array.from(restoredRingSelect.options).find((option) => option.hasAttribute("selected"))
        ?.value,
    ).toBe("sparkBand");

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
    expect(getElement(".forge-panel").textContent).toContain("Ember Loop - Ring");

    getButton("#craftSelectedRecipe").click();

    expect(getElement(".crafted-items").textContent).toContain("Ember Loop");
    expect(getElement(".crafted-items").textContent).toContain(
      "forgePlayer.ring.emberLoop.crafted.1",
    );
    expect(getElement(".forge-ingredients").textContent).toContain("1/1");
    expect(localStorage.getItem("battleness.developmentInventory.v1")).toContain(
      "forgePlayer.ring.emberLoop.crafted.1",
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
      "Quantity: 2",
    );

    getButton("#craftSelectedRecipe").click();

    expect(getElement('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]')).toBeTruthy();
    expect(getElement('[data-inventory-material-id="aluminium"]').textContent).toContain(
      "Quantity: 1",
    );

    selectValue("#inventoryTypeFilter", "gem");

    expect(document.querySelector('[data-inventory-kind="ring"]')).toBeNull();
    expect(getElement(".development-inventory").textContent).toContain("No crafted items yet");

    selectValue("#inventoryTypeFilter", "all");
    selectValue("#inventoryElementFilter", "fire");

    expect(getElement('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]')).toBeTruthy();

    selectValue("#inventoryElementFilter", "ice");

    expect(
      document.querySelector('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]'),
    ).toBeNull();
  });

  it("improves crafted inventory quality and ring sockets", () => {
    getButton("#craftSelectedRecipe").click();

    expect(getElement(".inventory-summary").textContent).toContain("1000");
    expect(
      getElement('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]').textContent,
    ).toContain("Quality: 50");

    getButton(
      '[data-improve-quality-type="ring"][data-improve-quality-id="forgePlayer.ring.emberLoop.crafted.1"]',
    ).click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]').textContent,
    ).toContain("Quality: 55");
    expect(getElement(".development-inventory").textContent).toContain("925");

    getButton('[data-improve-sockets-ring-id="forgePlayer.ring.emberLoop.crafted.1"]').click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]').textContent,
    ).toContain("Sockets: 2");
    expect(localStorage.getItem("battleness.developmentInventory.v1")).toContain(
      '"socketCount": 2',
    );

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");
    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.emberLoop.crafted.1",
    );

    expect(
      getInput(
        '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="quality"]',
      ).value,
    ).toBe("55");
    expect(getElement(".battle-lab-editor").textContent).toContain("Sockets");
  });

  it("uses crafted development inventory instances in Battle Lab", () => {
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftGemRubyShard");
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
    getButton("#craftSelectedRecipe").click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.emberLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.rubyShard.crafted.2"]').click();

    expect(
      getElement('[data-inventory-id="forgePlayer.ring.emberLoop.crafted.1"]').textContent,
    ).toContain("Ruby Shard");
    expect(
      getElement('[data-inventory-id="forgePlayer.gem.rubyShard.crafted.2"]').textContent,
    ).toContain("Spell: Firebolt");

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");

    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.emberLoop.crafted.1",
    );

    expect(
      getInput('[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="level"]')
        .disabled,
    ).toBe(true);
    expect(getElement(".battle-lab-editor").textContent).toContain("Sockets");
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.gem.rubyShard.crafted.2",
    );
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.spell.firebolt.crafted.3",
    );

    getButton("#startBattle").click();

    expect(getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]').textContent).toContain(
      "Ember Loop",
    );
  });

  it("builds a saved development loadout and sends it to Battle Lab", () => {
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftGemRubyShard");
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
    getButton("#craftSelectedRecipe").click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.emberLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.rubyShard.crafted.2"]').click();

    const loadoutRing = getInput('[data-loadout-ring-id="forgePlayer.ring.emberLoop.crafted.1"]');
    loadoutRing.checked = true;
    loadoutRing.dispatchEvent(new Event("change"));

    expect(getElement(".loadout-builder").textContent).toContain("Selected rings");
    expect(getElement(".loadout-builder").textContent).toContain("Ruby Shard");

    const loadoutName = getInput("#developmentLoadoutName");
    loadoutName.value = "Fire starter";
    getButton("#saveDevelopmentLoadout").click();

    expect(localStorage.getItem("battleness.developmentLoadouts.v1")).toContain("Fire starter");

    const selectedLoadoutRing = getInput(
      '[data-loadout-ring-id="forgePlayer.ring.emberLoop.crafted.1"]',
    );
    selectedLoadoutRing.checked = false;
    selectedLoadoutRing.dispatchEvent(new Event("change"));
    getButton("#loadDevelopmentLoadout").click();

    expect(getInput('[data-loadout-ring-id="forgePlayer.ring.emberLoop.crafted.1"]').checked).toBe(
      true,
    );

    getButton("#sendLoadoutToPlayerOne").click();

    expect(getSelect("#battleLabItemSourceMode").value).toBe("inventory");
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.ring.emberLoop.crafted.1",
    );
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.gem.rubyShard.crafted.2",
    );
    expect(getElement(".battle-lab-editor").textContent).toContain(
      "forgePlayer.spell.firebolt.crafted.3",
    );

    getButton("#startBattle").click();

    expect(getButton('[data-board-ring-id="labPlayerOne.lab.ring.1"]').textContent).toContain(
      "Ember Loop",
    );
  });

  it("renders rare monster borders on the battle board", () => {
    startBattle("skillShowcase");

    expect(
      getButton('[data-board-monster-id="playerTwo.monster.shieldWisp.1"]').classList,
    ).toContain("rarity-rare");
    expect(
      getElement('[data-board-monster-id="playerTwo.monster.shieldWisp.1"] .element-badge')
        .textContent,
    ).toBe("Ice");
  });

  it("claims deterministic battle rewards into the development inventory", () => {
    startBattle("basicRingAttack");

    getButton("#manualConcede").click();

    expect(getElement(".battle-rewards").textContent).toContain("Battle rewards");
    expect(getElement(".battle-rewards").textContent).toContain("+150");
    expect(getElement(".battle-rewards").textContent).toContain("Aluminium x1");

    getButton("#claimBattleRewards").click();

    expect(getButton("#claimBattleRewards").disabled).toBe(true);
    expect(getButton("#claimBattleRewards").textContent).toContain("Rewards claimed");
    expect(localStorage.getItem("battleness.developmentInventory.v1")).toContain('"credits": 1150');
    expect(localStorage.getItem("battleness.developmentInventory.v1")).toContain('"aluminium": 3');

    getButton("#backToSetup").click();

    expect(getElement('[data-inventory-material-id="aluminium"]').textContent).toContain(
      "Quantity: 3",
    );
    expect(getElement(".inventory-summary").textContent).toContain("1150");
  });

  it("claims cumulative item XP for equipped and used development inventory items", () => {
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftGemRubyShard");
    getButton("#craftSelectedRecipe").click();
    selectValue("#forgeRecipeSelect", "craftSpellFirebolt");
    getButton("#craftSelectedRecipe").click();
    getButton('[data-socket-gem-ring-id="forgePlayer.ring.emberLoop.crafted.1"]').click();
    getButton('[data-enchant-gem-id="forgePlayer.gem.rubyShard.crafted.2"]').click();

    selectValue("#setupMode", "battleLab");
    selectValue("#battleLabItemSourceMode", "inventory");
    selectValue(
      '[data-lab-player-index="0"][data-lab-ring-index="0"][data-lab-ring-field="sourceInstanceId"]',
      "forgePlayer.ring.emberLoop.crafted.1",
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

    expect(getElement(".battle-rewards").textContent).toContain("Ember Loop +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Ruby Shard +28 XP");
    expect(getElement(".battle-rewards").textContent).toContain("Firebolt +28 XP");

    getButton("#claimBattleRewards").click();

    const inventory = JSON.parse(
      localStorage.getItem("battleness.developmentInventory.v1") ?? "{}",
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
        (crafted) => crafted.item.id === "forgePlayer.ring.emberLoop.crafted.1",
      )?.item.experience,
    ).toBe(128);
    expect(
      inventory.craftedItems.find(
        (crafted) => crafted.item.id === "forgePlayer.gem.rubyShard.crafted.2",
      )?.item.experience,
    ).toBe(128);
    expect(
      inventory.craftedItems.find(
        (crafted) => crafted.item.id === "forgePlayer.spell.firebolt.crafted.3",
      )?.item.experience,
    ).toBe(128);
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
    for (let turn = 0; turn < 7; turn += 1) {
      getButton("#boardEndTurn").click();
    }

    getButton('[data-board-ring-id="playerTwo.ring.frostSeal"]').click();
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

    useBoardMonster("playerOne.monster.arcStriker.1", "playerTwo.monster.iceGuardian.1");

    expect(
      getButton('[data-board-monster-id="playerTwo.monster.shieldWisp.1"]').textContent,
    ).toContain("Shield - Broken");
    expect(
      getButton('[data-board-monster-id="playerTwo.monster.emberImp.1"]').textContent,
    ).toContain("Rage - Active");

    useBoardMonster("playerOne.monster.stormHound.1", "playerTwo.monster.iceGuardian.1");
    useBoardMonster("playerOne.monster.emberLancer.1", "playerTwo.monster.iceGuardian.1");

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
  getButton('[data-board-ring-id="playerOne.ring.sparkBand"]').click();
  getButton('[data-board-target-id="playerTwo.hero"]').click();
}

function useBoardMonster(monsterInstanceId: string, targetId: string): void {
  getButton(`[data-board-monster-id="${monsterInstanceId}"]`).click();
  getButton(`[data-board-target-id="${targetId}"]`).click();
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
