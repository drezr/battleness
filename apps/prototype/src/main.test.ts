// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("battle board interactions", () => {
  beforeEach(async () => {
    vi.resetModules();
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

function getElement<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Expected element matching ${selector}.`);
  }

  return element;
}
