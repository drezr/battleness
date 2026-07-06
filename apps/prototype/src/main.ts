import {
  contentVersion,
  createBattleSetupFromFixture,
  definitions,
  fixtures,
  locales,
  validateContent,
} from "@battleness/content";
import {
  applyBattleAction,
  assertBattleRecordResult,
  assertBattleRecordState,
  createBattleRecord,
  createBattleState,
  parseBattleRecord,
  rulesVersion,
  serializeBattleRecord,
  type BattleAction,
  type BattleEvent,
  type BattleRecord,
  type BattleResult,
  type BattleState,
  type ElementType,
  type Rarity,
  type TargetId,
} from "@battleness/engine";
import { itemArtworkStyle, validateItemAssets, type ItemAssetKind } from "./itemAssets";
import "./styles.css";

validateContent();
validateItemAssets();

type Scenario = (typeof fixtures.scenarios)[number];
type BattlePlayerView = BattleState["players"][number];
type RingView = BattlePlayerView["rings"][number];
type GemView = RingView["gems"][number];
type MonsterView = BattlePlayerView["monsters"][number];
type TargetOption = {
  id: TargetId;
  label: string;
  disabled: boolean;
  reasonKey?: string;
};
const elementTypes = ["fire", "ice", "electric"] as const satisfies readonly ElementType[];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Prototype app root was not found.");
}

const root = app;
let selectedScenarioId = fixtures.scenarios[0]?.id ?? "";
let state = createState();
let isSetupOpen = true;
let actionIndex = 0;
let errorMessage: string | null = null;
let manualTargetId: TargetId = "playerTwo.hero";
let selectedRingInstanceId: string | null = null;
let selectedMonsterInstanceId: string | null = null;
let battleRecordText = "";
let replayRecord: BattleRecord | null = null;
let replayActionIndex = 0;

render();

function createState(): BattleState {
  return createBattleState(
    createBattleSetupFromFixture(currentScenario().battleSetupId ?? "basicDuel"),
  );
}

function currentScenario(): Scenario {
  const scenario = fixtures.scenarios.find((candidate) => candidate.id === selectedScenarioId);
  if (!scenario) {
    throw new Error(`Scenario ${selectedScenarioId} was not found.`);
  }

  return scenario;
}

function t(key: string): string {
  const messages = locales.en as Record<string, string>;
  return messages[key] ?? key;
}

function render(): void {
  if (isSetupOpen) {
    renderSetup();
    return;
  }

  const scenario = currentScenario();
  const displayedActions = replayRecord?.actions ?? (scenario.actions as readonly BattleAction[]);
  const displayedActionIndex = replayRecord ? replayActionIndex : actionIndex;
  const remainingActions = Math.max(0, displayedActions.length - displayedActionIndex);
  ensureValidManualTarget();
  ensureValidSelectedRing();
  ensureValidSelectedMonster();

  root.innerHTML = `
    <section class="shell">
      <header class="topbar">
        <div>
          <img
            class="brand-logo"
            src="/assets/brand/battleness-logo.png"
            width="1536"
            height="1024"
            alt="BattleNess"
          />
          <h1>${escapeHtml(t("ui.title"))}</h1>
        </div>
        <label class="scenario-picker">
          <span>${escapeHtml(t("ui.scenario"))}</span>
          <select id="scenarioSelect">
            ${fixtures.scenarios
              .map(
                (candidate) => `
                  <option value="${escapeHtml(candidate.id)}" ${
                    candidate.id === scenario.id ? "selected" : ""
                  }>
                    ${escapeHtml(t(candidate.descriptionKey))}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
      </header>

      <section class="summary" aria-label="${escapeHtml(t("ui.battle"))}">
        ${stat(t("ui.battle"), state.id)}
        ${stat(t("ui.status"), state.status)}
        ${stat(t("ui.activePlayer"), state.activePlayerId ?? "-")}
        ${stat(t("ui.remainingActions"), String(remainingActions))}
        ${stat(t("ui.events"), String(state.log.length))}
      </section>

      <section class="controls">
        <button id="backToSetup">${escapeHtml(t("ui.battleSetup"))}</button>
        <button id="nextAction" ${remainingActions === 0 || replayRecord ? "disabled" : ""}>
          ${escapeHtml(t("ui.nextAction"))}
        </button>
        <button id="runAll" ${remainingActions === 0 || replayRecord ? "disabled" : ""}>
          ${escapeHtml(t("ui.runAll"))}
        </button>
        <button id="resetScenario">${escapeHtml(t("ui.reset"))}</button>
      </section>

      ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ""}

      ${renderBattleBoard()}

      <main class="layout">
        ${renderReplayPanel()}

        <section class="panel players">
          <h2>${escapeHtml(t("ui.players"))}</h2>
          <div class="player-grid">
            ${state.players.map(renderPlayer).join("")}
          </div>
        </section>

        <section class="panel actions">
          ${renderManualActions()}
        </section>

        <section class="panel actions">
          <h2>${escapeHtml(t("ui.remainingActions"))}</h2>
          <ol>
            ${displayedActions
              .map((action, index) => renderAction(action, index, displayedActionIndex))
              .join("")}
          </ol>
        </section>

        <section class="panel log">
          <h2>${escapeHtml(t("ui.eventLog"))}</h2>
          <ol>
            ${state.log.slice().reverse().map(renderEvent).join("")}
          </ol>
        </section>
      </main>
    </section>
  `;

  bindEvents();
}

function renderSetup(): void {
  const scenario = currentScenario();
  const setup = createBattleSetupFromFixture(scenario.battleSetupId ?? "basicDuel");
  const playerNames = setup.players.map((player) => player.username).join(t("ui.listSeparator"));

  root.innerHTML = `
    <section class="shell">
      <header class="topbar">
        <div>
          <img
            class="brand-logo"
            src="/assets/brand/battleness-logo.png"
            width="1536"
            height="1024"
            alt="BattleNess"
          />
          <h1>${escapeHtml(t("ui.battleSetup"))}</h1>
        </div>
        <label class="scenario-picker">
          <span>${escapeHtml(t("ui.scenario"))}</span>
          <select id="scenarioSelect">
            ${fixtures.scenarios
              .map(
                (candidate) => `
                  <option value="${escapeHtml(candidate.id)}" ${
                    candidate.id === scenario.id ? "selected" : ""
                  }>
                    ${escapeHtml(t(candidate.descriptionKey))}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
      </header>

      <main class="setup-layout">
        <section class="panel setup-summary">
          <h2>${escapeHtml(t("ui.battleSetup"))}</h2>
          <dl class="setup-stats">
            ${stat(t("ui.battle"), setup.id)}
            ${stat(t("ui.scenario"), t(scenario.descriptionKey))}
            ${stat(t("ui.players"), playerNames)}
            ${stat(t("ui.seed"), setup.seed)}
          </dl>
          <div class="controls setup-controls">
            <button id="startBattle">${escapeHtml(t("ui.startBattle"))}</button>
          </div>
        </section>

        <section class="panel players">
          <h2>${escapeHtml(t("ui.players"))}</h2>
          <div class="player-grid">
            ${setup.players.map(renderSetupPlayer).join("")}
          </div>
        </section>

        <section class="panel actions">
          <h2>${escapeHtml(t("ui.remainingActions"))}</h2>
          <ol>
            ${scenario.actions.map((action, index) => renderAction(action as BattleAction, index)).join("")}
          </ol>
        </section>

        ${renderAssetCollection()}
      </main>
    </section>
  `;

  bindEvents();
}

function renderAssetCollection(): string {
  return `
    <section class="panel asset-collection">
      <h2>${escapeHtml(t("ui.collection"))}</h2>
      <div class="asset-groups">
        ${renderAssetGroup("ring", t("ui.rings"), definitions.rings)}
        ${renderAssetGroup("gem", t("ui.gems"), definitions.gems)}
        ${renderAssetGroup("monster", t("ui.monsters"), definitions.monsters)}
        ${renderAssetGroup("spell", t("ui.spells"), definitions.spells)}
        ${renderAssetGroup("material", t("ui.materials"), definitions.materials)}
      </div>
    </section>
  `;
}

function renderAssetGroup(
  kind: ItemAssetKind,
  label: string,
  items: readonly {
    id: string;
    nameKey: string;
    rarity: string;
    element?: string;
  }[],
): string {
  return `
    <details class="asset-group" ${kind === "ring" ? "open" : ""}>
      <summary>
        <span>${escapeHtml(label)}</span>
        <small>${items.length}</small>
      </summary>
      <div class="asset-grid">
        ${items
          .map(
            (item) => `
              <article
                class="asset-card ${rarityClass(item.rarity as Rarity)}"
                data-asset-kind="${kind}"
                data-asset-id="${escapeHtml(item.id)}"
                data-rarity="${item.rarity}"
              >
                ${item.element ? renderElementBadge(item.element as ElementType) : ""}
                ${renderItemArtwork(kind, item.id)}
                <strong>${escapeHtml(t(item.nameKey))}</strong>
                <small>${escapeHtml(t(`ui.rarity.${item.rarity}`))}</small>
              </article>
            `,
          )
          .join("")}
      </div>
    </details>
  `;
}

function bindEvents(): void {
  document
    .querySelector<HTMLSelectElement>("#scenarioSelect")
    ?.addEventListener("change", (event) => {
      selectedScenarioId = (event.currentTarget as HTMLSelectElement).value;
      openSetup();
      render();
    });

  document.querySelector<HTMLButtonElement>("#startBattle")?.addEventListener("click", () => {
    startBattle();
    render();
  });

  document.querySelector<HTMLButtonElement>("#backToSetup")?.addEventListener("click", () => {
    openSetup();
    render();
  });

  document.querySelector<HTMLButtonElement>("#nextAction")?.addEventListener("click", () => {
    runNextAction();
    render();
  });

  document.querySelector<HTMLButtonElement>("#runAll")?.addEventListener("click", () => {
    while (actionIndex < currentScenario().actions.length && !errorMessage) {
      runNextAction();
    }
    render();
  });

  document.querySelector<HTMLButtonElement>("#resetScenario")?.addEventListener("click", () => {
    resetScenario();
    render();
  });

  document
    .querySelector<HTMLTextAreaElement>("#battleRecordText")
    ?.addEventListener("input", (event) => {
      battleRecordText = (event.currentTarget as HTMLTextAreaElement).value;
    });

  document
    .querySelector<HTMLButtonElement>("#exportBattleRecord")
    ?.addEventListener("click", () => {
      exportCurrentBattleRecord();
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#importBattleRecord")
    ?.addEventListener("click", () => {
      importBattleRecord();
      render();
    });

  document.querySelector<HTMLButtonElement>("#replayNextAction")?.addEventListener("click", () => {
    runNextReplayAction();
    render();
  });

  document.querySelector<HTMLButtonElement>("#replayAllActions")?.addEventListener("click", () => {
    while (replayRecord && replayActionIndex < replayRecord.actions.length && !errorMessage) {
      runNextReplayAction();
    }
    render();
  });

  document
    .querySelector<HTMLSelectElement>("#manualTarget")
    ?.addEventListener("change", (event) => {
      manualTargetId = (event.currentTarget as HTMLSelectElement).value as TargetId;
      render();
    });

  document.querySelectorAll<HTMLButtonElement>("[data-board-target-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.boardTargetId as TargetId | undefined;
      if (targetId) {
        selectBoardTarget(targetId, button.dataset.boardMonsterId);
      }
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-board-ring-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const ringInstanceId = button.dataset.boardRingId;
      if (ringInstanceId) {
        selectedRingInstanceId = selectedRingInstanceId === ringInstanceId ? null : ringInstanceId;
        selectedMonsterInstanceId = null;
      }
      render();
    });
  });

  document.querySelector<HTMLButtonElement>("#boardEndTurn")?.addEventListener("click", () => {
    const activePlayer = getActivePlayer();
    if (activePlayer) {
      applyManualAction({ type: "endTurn", playerId: activePlayer.id });
    }
    render();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-manual-ring-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const ringInstanceId = button.dataset.manualRingId;
      if (ringInstanceId) {
        useManualRing(ringInstanceId);
      }
      render();
    });
  });

  document
    .querySelectorAll<HTMLButtonElement>("[data-manual-element-player-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const playerId = button.dataset.manualElementPlayerId;
        const element = button.dataset.manualElement as ElementType | undefined;
        if (playerId && element) {
          chooseManualElement(playerId, element);
        }
        render();
      });
    });

  document.querySelectorAll<HTMLButtonElement>("[data-manual-monster-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const monsterInstanceId = button.dataset.manualMonsterId;
      if (monsterInstanceId) {
        useManualMonster(monsterInstanceId);
      }
      render();
    });
  });

  document.querySelector<HTMLButtonElement>("#manualEndTurn")?.addEventListener("click", () => {
    const activePlayer = getActivePlayer();
    if (activePlayer) {
      applyManualAction({ type: "endTurn", playerId: activePlayer.id });
    }
    render();
  });

  document.querySelector<HTMLButtonElement>("#manualConcede")?.addEventListener("click", () => {
    const activePlayer = getActivePlayer();
    if (activePlayer) {
      applyManualAction({ type: "concede", playerId: activePlayer.id });
    }
    render();
  });
}

function runNextAction(): void {
  const action = currentScenario().actions[actionIndex] as BattleAction | undefined;
  if (!action) {
    return;
  }

  try {
    state = applyBattleAction(state, action).state;
    actionIndex += 1;
    errorMessage = null;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function renderReplayPanel(): string {
  const totalActions = replayRecord?.actions.length ?? 0;
  const hasRemainingReplayActions = Boolean(
    replayRecord && replayActionIndex < replayRecord.actions.length,
  );
  const progress = formatMessage("ui.replayProgress", {
    current: String(replayActionIndex),
    total: String(totalActions),
  });

  return `
    <section class="panel replay-panel">
      <h2>${escapeHtml(t("ui.battleRecord"))}</h2>
      <div class="controls replay-controls">
        <button id="exportBattleRecord">${escapeHtml(t("ui.exportReplay"))}</button>
        <button id="importBattleRecord">${escapeHtml(t("ui.importReplay"))}</button>
        <button id="replayNextAction" ${hasRemainingReplayActions ? "" : "disabled"}>
          ${escapeHtml(t("ui.replayNext"))}
        </button>
        <button id="replayAllActions" ${hasRemainingReplayActions ? "" : "disabled"}>
          ${escapeHtml(t("ui.replayAll"))}
        </button>
      </div>
      <p class="muted">${escapeHtml(progress)}</p>
      <textarea
        id="battleRecordText"
        aria-label="${escapeHtml(t("ui.battleRecordJson"))}"
        placeholder="${escapeHtml(t("ui.battleRecordPlaceholder"))}"
        spellcheck="false"
      >${escapeHtml(battleRecordText)}</textarea>
    </section>
  `;
}

function exportCurrentBattleRecord(): void {
  try {
    battleRecordText = serializeBattleRecord(
      createBattleRecord(state, {
        rulesVersion,
        contentVersion,
      }),
    );
    errorMessage = null;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function importBattleRecord(): void {
  const recordText =
    document.querySelector<HTMLTextAreaElement>("#battleRecordText")?.value ?? battleRecordText;
  battleRecordText = recordText;

  try {
    const record = parseBattleRecord(recordText);
    if (record.rulesVersion !== rulesVersion || record.contentVersion !== contentVersion) {
      throw new Error(
        formatMessage("ui.replayVersionMismatch", {
          rulesVersion: record.rulesVersion,
          contentVersion: record.contentVersion,
        }),
      );
    }

    const matchingScenario = fixtures.scenarios.find(
      (scenario) => (scenario.battleSetupId ?? "basicDuel") === record.setup.id,
    );
    if (matchingScenario) {
      selectedScenarioId = matchingScenario.id;
    }

    replayRecord = record;
    replayActionIndex = 0;
    state = createBattleState(record.setup);
    if (record.actions.length === 0) {
      assertBattleRecordResult(record, state);
      assertBattleRecordState(record, state);
    }
    actionIndex = 0;
    errorMessage = null;
    selectedRingInstanceId = null;
    selectedMonsterInstanceId = null;
    isSetupOpen = false;
    manualTargetId = defaultTargetId();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function runNextReplayAction(): void {
  const action = replayRecord?.actions[replayActionIndex];
  if (!replayRecord || !action) {
    return;
  }

  try {
    state = applyBattleAction(state, action).state;
    replayActionIndex += 1;
    if (replayActionIndex === replayRecord.actions.length) {
      assertBattleRecordResult(replayRecord, state);
      assertBattleRecordState(replayRecord, state);
    }
    errorMessage = null;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function resetScenario(): void {
  state = createState();
  actionIndex = 0;
  replayRecord = null;
  replayActionIndex = 0;
  errorMessage = null;
  selectedRingInstanceId = null;
  selectedMonsterInstanceId = null;
  manualTargetId = defaultTargetId();
}

function openSetup(): void {
  state = createState();
  actionIndex = 0;
  replayRecord = null;
  replayActionIndex = 0;
  errorMessage = null;
  selectedRingInstanceId = null;
  selectedMonsterInstanceId = null;
  isSetupOpen = true;
}

function startBattle(): void {
  state = createState();
  actionIndex = 0;
  replayRecord = null;
  replayActionIndex = 0;
  errorMessage = null;
  selectedRingInstanceId = null;
  selectedMonsterInstanceId = null;
  isSetupOpen = false;
  manualTargetId = defaultTargetId();
}

function renderManualActions(): string {
  const activePlayer = getActivePlayer();
  const isFinished = state.status === "finished" || isReplayLocked();

  if (state.status === "choosingFirstPlayer") {
    return renderElementChoiceActions();
  }

  if (!activePlayer) {
    return `
      <h2>${escapeHtml(t("ui.manualActions"))}</h2>
      <p class="muted">${escapeHtml(t("ui.status"))}: ${escapeHtml(state.status)}</p>
    `;
  }

  const targets = targetOptions();
  const targetNotice = targetSelectionNotice(targets);

  return `
    <h2>${escapeHtml(t("ui.manualActions"))}</h2>
    <label class="target-picker">
      <span>${escapeHtml(t("ui.target"))}</span>
      <select id="manualTarget" ${isFinished ? "disabled" : ""}>
        ${targets
          .map(
            (target) => `
              <option value="${escapeHtml(target.id)}" ${target.disabled ? "disabled" : ""} ${
                target.id === manualTargetId ? "selected" : ""
              }>
                ${escapeHtml(target.label)}
              </option>
            `,
          )
          .join("")}
      </select>
      ${targetNotice ? `<p class="target-notice">${escapeHtml(targetNotice)}</p>` : ""}
    </label>

    <h4>${escapeHtml(t("ui.rings"))}</h4>
    <div class="button-list">
      ${activePlayer.rings
        .map((ring) => {
          const disabled =
            isFinished || ring.currentCooldown > 0 || activePlayer.energy.current < ring.energyCost;
          return `
            <button class="action-button ${rarityClass(ring.rarity)}" data-manual-ring-id="${escapeHtml(ring.id)}" data-rarity="${ring.rarity}" ${
              disabled ? "disabled" : ""
            }>
              ${renderElementBadge(ring.element)}
              <strong>${escapeHtml(t(ring.nameKey))}</strong>
              <span>
                ${escapeHtml(t("ui.energy"))} ${ring.energyCost} /
                ${escapeHtml(t("ui.damage"))} ${ringTotalDamage(ring)} /
                ${escapeHtml(t("ui.cooldown"))} ${ring.currentCooldown}/${ring.cooldown}
              </span>
            </button>
          `;
        })
        .join("")}
    </div>

    <h4>${escapeHtml(t("ui.monsters"))}</h4>
    <div class="button-list">
      ${
        activePlayer.monsters.length > 0
          ? activePlayer.monsters
              .map((monster) => {
                const disabled = isFinished || monster.currentCooldown > 0;
                return `
                  <button class="action-button ${rarityClass(monster.rarity)}" data-manual-monster-id="${escapeHtml(monster.id)}" data-rarity="${monster.rarity}" ${
                    disabled ? "disabled" : ""
                  }>
                    ${renderElementBadge(monster.element)}
                    ${escapeHtml(t(monster.nameKey))} - ${escapeHtml(t("ui.cooldown"))} ${
                      monster.currentCooldown
                    }
                  </button>
                `;
              })
              .join("")
          : `<p class="muted">${escapeHtml(t("ui.noMonster"))}</p>`
      }
    </div>

    <div class="button-list split">
      <button id="manualEndTurn" ${isFinished ? "disabled" : ""}>${escapeHtml(
        t("ui.action.endTurn"),
      )}</button>
      <button id="manualConcede" ${isFinished ? "disabled" : ""}>${escapeHtml(
        t("ui.action.concede"),
      )}</button>
    </div>
  `;
}

function renderBattleBoard(): string {
  const [bottomPlayer, topPlayer] = state.players;
  const activePlayer = getActivePlayer();
  const isFinished = state.status === "finished" || isReplayLocked();

  return `
    <section class="battle-board" aria-label="${escapeHtml(t("ui.battleBoard"))}">
      ${renderEnergyTrack(topPlayer, "top")}
      ${renderRingBelt(topPlayer, "top", activePlayer)}
      ${renderBoardActionHint()}
      <div class="board-main">
        <aside class="hero-rail">
          ${renderBoardHero(topPlayer, "top")}
          <div class="turn-stack">
            <strong>${escapeHtml(String(activePlayer?.energy.turnCount ?? 0))}</strong>
            <span>${escapeHtml(t("ui.turn"))}</span>
            <button id="boardEndTurn" ${!activePlayer || isFinished ? "disabled" : ""}>
              ${escapeHtml(t("ui.action.endTurn"))}
            </button>
          </div>
          ${renderBoardHero(bottomPlayer, "bottom")}
        </aside>

        <section class="monster-field" aria-label="${escapeHtml(t("ui.monsters"))}">
          ${renderMonsterRow(topPlayer, "top")}
          ${renderMonsterRow(bottomPlayer, "bottom")}
        </section>
      </div>

      ${renderRingBelt(bottomPlayer, "bottom", activePlayer)}
      ${renderEnergyTrack(bottomPlayer, "bottom")}
    </section>
  `;
}

function renderBoardActionHint(): string {
  const selectedRing = selectedBoardRing();
  const selectedMonster = selectedBoardMonster();
  const message = selectedRing
    ? formatMessage("ui.boardRingPrepared", { ring: t(selectedRing.nameKey) })
    : selectedMonster
      ? formatMessage("ui.boardMonsterPrepared", { monster: t(selectedMonster.nameKey) })
      : t("ui.boardSelectAction");

  return `<p class="board-action-hint">${escapeHtml(message)}</p>`;
}

function renderEnergyTrack(player: BattlePlayerView, position: "top" | "bottom"): string {
  const slots = Array.from({ length: 8 }, (_, index) => index < player.energy.current);
  return `
    <div class="energy-track ${position}">
      <div class="energy-slots">
        ${slots.map((filled) => `<span class="${filled ? "filled" : ""}"></span>`).join("")}
      </div>
      <strong>${escapeHtml(player.username)}</strong>
      <span>${escapeHtml(t("ui.energy"))} ${player.energy.current}/${player.energy.maxForTurn}</span>
    </div>
  `;
}

function renderBoardHero(player: BattlePlayerView, position: "top" | "bottom"): string {
  const targetId = `${player.id}.hero` as TargetId;
  const disabledReason = targetDisabledReason(targetId);
  const isSelected = manualTargetId === targetId;
  const targetClass = disabledReason ? "blocked" : "legal";

  return `
    <button
      class="board-hero ${position} ${targetClass} ${isSelected ? "selected" : ""}"
      data-board-target-id="${escapeHtml(targetId)}"
      ${disabledReason ? "disabled" : ""}
    >
      <strong>${escapeHtml(player.username)}</strong>
      <span>${escapeHtml(t("ui.hero"))}</span>
      <small>${escapeHtml(t("ui.health"))} ${player.hero.health}/${player.hero.maxHealth}</small>
    </button>
  `;
}

function renderMonsterRow(player: BattlePlayerView, position: "top" | "bottom"): string {
  return `
    <div class="monster-row ${position}">
      ${Array.from({ length: 3 }, (_, index) => renderMonsterSlot(player, index)).join("")}
    </div>
  `;
}

function renderMonsterSlot(player: BattlePlayerView, index: number): string {
  const monster = player.monsters[index];
  if (!monster) {
    return `<div class="monster-slot empty">${escapeHtml(t("ui.emptySlot"))}</div>`;
  }

  const targetId = monster.id as TargetId;
  const disabledReason = targetDisabledReason(targetId);
  const isTargetSelected = manualTargetId === targetId;
  const isActionSelected = selectedMonsterInstanceId === monster.id;
  const targetClass = disabledReason ? "blocked" : "legal";
  const actionClass = boardMonsterUnavailableReason(monster, player)
    ? "action-unavailable"
    : "action-ready";

  return `
    <button
      class="monster-slot ${rarityClass(monster.rarity)} ${targetClass} ${actionClass} ${
        isTargetSelected ? "selected" : ""
      } ${isActionSelected ? "prepared" : ""}"
      data-board-target-id="${escapeHtml(targetId)}"
      data-board-monster-id="${escapeHtml(monster.id)}"
      data-rarity="${monster.rarity}"
      ${disabledReason ? "disabled" : ""}
    >
      ${renderElementBadge(monster.element)}
      <span class="monster-skill">${renderSkillBadges(monster) || t("ui.none")}</span>
      ${renderItemArtwork("monster", monster.definitionId)}
      <strong>${escapeHtml(t(monster.nameKey))}</strong>
      <span class="monster-stats">
        <span>${escapeHtml(t("ui.damage"))} ${monster.damage}</span>
        <span>${escapeHtml(t("ui.health"))} ${monster.health}/${monster.maxHealth}</span>
        <span>${escapeHtml(t("ui.cooldown"))} ${monster.currentCooldown}/${monster.cooldown}</span>
      </span>
    </button>
  `;
}

function renderRingBelt(
  player: BattlePlayerView,
  position: "top" | "bottom",
  activePlayer: BattlePlayerView | null,
): string {
  return `
    <div class="ring-belt ${position}" aria-label="${escapeHtml(
      formatMessage("ui.playerRings", { player: player.username }),
    )}">
      <span class="ring-belt-label">${escapeHtml(
        formatMessage("ui.playerRings", { player: player.username }),
      )}</span>
      <div class="ring-belt-cards">
        ${player.rings.map((ring) => renderBoardRing(ring, activePlayer)).join("")}
      </div>
    </div>
  `;
}

function renderBoardRing(ring: RingView, activePlayer: BattlePlayerView | null): string {
  const unavailableReason = boardRingUnavailableReason(ring, activePlayer);
  const isSelected = selectedRingInstanceId === ring.id;

  return `
    <button class="board-ring ${rarityClass(ring.rarity)} ${
      isSelected ? "selected" : ""
    } ${unavailableReason ? "unavailable" : "ready"}" data-board-ring-id="${escapeHtml(
      ring.id,
    )}" data-rarity="${ring.rarity}" ${unavailableReason ? "disabled" : ""}>
      ${renderElementBadge(ring.element)}
      ${renderItemArtwork("ring", ring.definitionId)}
      <strong>${escapeHtml(t(ring.nameKey))}</strong>
      <span class="ring-stats">
        <span>${escapeHtml(t("ui.damage"))} ${ringTotalDamage(ring)}</span>
        <span>${escapeHtml(t("ui.energy"))} ${ring.energyCost}</span>
        <span>${escapeHtml(t("ui.cooldown"))} ${ring.currentCooldown}/${ring.cooldown}</span>
      </span>
      <span class="ring-state">${escapeHtml(unavailableReason ? t(unavailableReason) : t("ui.ready"))}</span>
      <span class="ring-gems">
        ${Array.from({ length: 3 }, (_, index) => {
          const gem = ring.gems[index];
          return `<span class="${
            gem ? `filled ${rarityClass(gem.rarity)} element-${gem.element}` : ""
          }" data-rarity="${gem?.rarity ?? ""}" title="${
            gem ? escapeHtml(`${t(gem.nameKey)} - ${t(`ui.element.${gem.element}`)}`) : ""
          }" ${gem ? `style="${itemArtworkStyle("gem", gem.definitionId)}"` : ""}></span>`;
        }).join("")}
      </span>
    </button>
  `;
}

function boardRingUnavailableReason(
  ring: RingView,
  activePlayer: BattlePlayerView | null,
): string | null {
  if (isReplayLocked()) {
    return "ui.replayInProgress";
  }

  if (!activePlayer || state.status !== "active" || ring.ownerId !== activePlayer.id) {
    return "ui.notActive";
  }

  if (ring.currentCooldown > 0) {
    return "ui.onCooldown";
  }

  if (activePlayer.energy.current < ring.energyCost) {
    return "ui.notEnoughEnergy";
  }

  return null;
}

function boardMonsterUnavailableReason(
  monster: MonsterView,
  player: BattlePlayerView,
): string | null {
  if (isReplayLocked()) {
    return "ui.replayInProgress";
  }

  const activePlayer = getActivePlayer();
  if (!activePlayer || state.status !== "active" || player.id !== activePlayer.id) {
    return "ui.notActive";
  }

  if (monster.currentCooldown > 0) {
    return "ui.onCooldown";
  }

  return null;
}

function renderElementChoiceActions(): string {
  return `
    <h2>${escapeHtml(t("ui.manualActions"))}</h2>
    <p class="muted">${escapeHtml(t("ui.chooseStartingElement"))}</p>
    <div class="element-choice-grid">
      ${state.players
        .map((player) => {
          const chosenElement = state.firstPlayerChoices?.[player.id];
          return `
            <article>
              <h4>${escapeHtml(player.username)}</h4>
              <div class="button-list element-buttons">
                ${elementTypes
                  .map(
                    (element) => `
                      <button
                        data-manual-element-player-id="${escapeHtml(player.id)}"
                        data-manual-element="${escapeHtml(element)}"
                        ${chosenElement || isReplayLocked() ? "disabled" : ""}
                      >
                        ${escapeHtml(t(`ui.element.${element}`))}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
              <p class="muted">
                ${escapeHtml(
                  chosenElement ? t(`ui.element.${chosenElement}`) : t("ui.noElementChoice"),
                )}
              </p>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function chooseManualElement(playerId: string, element: ElementType): void {
  applyManualAction({
    type: "chooseElement",
    playerId,
    element,
  });
}

function selectBoardTarget(targetId: TargetId, monsterInstanceId?: string): void {
  if (!selectedRingInstanceId && monsterInstanceId) {
    const monster = activePlayerMonster(monsterInstanceId);
    if (monster && !boardMonsterUnavailableReason(monster.monster, monster.player)) {
      selectedMonsterInstanceId =
        selectedMonsterInstanceId === monsterInstanceId ? null : monsterInstanceId;
      return;
    }
  }

  manualTargetId = targetId;

  if (selectedRingInstanceId) {
    useManualRingOnTarget(selectedRingInstanceId, targetId);
    return;
  }

  if (selectedMonsterInstanceId) {
    useManualMonsterOnTarget(selectedMonsterInstanceId, targetId);
  }
}

function useManualRing(ringInstanceId: string): void {
  useManualRingOnTarget(ringInstanceId, manualTargetId);
}

function useManualRingOnTarget(ringInstanceId: string, targetId: TargetId): void {
  const activePlayer = getActivePlayer();
  if (!activePlayer) {
    return;
  }

  const ring = activePlayer.rings.find((candidate) => candidate.id === ringInstanceId);
  if (!ring) {
    return;
  }

  const enchantmentTargets = Object.fromEntries(
    ring.gems.filter((gem) => gem.enchantment?.type === "spell").map((gem) => [gem.id, targetId]),
  );

  applyManualAction({
    type: "useRing",
    playerId: activePlayer.id,
    ringInstanceId,
    targetId,
    enchantmentTargets,
  });
}

function useManualMonster(monsterInstanceId: string): void {
  useManualMonsterOnTarget(monsterInstanceId, manualTargetId);
}

function useManualMonsterOnTarget(monsterInstanceId: string, targetId: TargetId): void {
  const activePlayer = getActivePlayer();
  if (!activePlayer) {
    return;
  }

  applyManualAction({
    type: "useMonster",
    playerId: activePlayer.id,
    monsterInstanceId,
    targetId,
  });
}

function applyManualAction(action: BattleAction): void {
  try {
    replayRecord = null;
    replayActionIndex = 0;
    state = applyBattleAction(state, action).state;
    errorMessage = null;
    selectedRingInstanceId = null;
    selectedMonsterInstanceId = null;
    ensureValidManualTarget();
    ensureValidSelectedRing();
    ensureValidSelectedMonster();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function renderPlayer(player: BattlePlayerView): string {
  return `
    <article class="player-card ${player.id === state.activePlayerId ? "active" : ""}">
      <h3>${escapeHtml(player.username)}</h3>
      <dl>
        ${stat(t("ui.health"), `${player.hero.health}/${player.hero.maxHealth}`)}
        ${stat(t("ui.energy"), `${player.energy.current}/${player.energy.maxForTurn}`)}
      </dl>

      <h4>${escapeHtml(t("ui.rings"))}</h4>
      <ul class="object-list">
        ${player.rings
          .map(
            (ring) => `
              <li class="ring-item ${rarityClass(ring.rarity)}" data-rarity="${ring.rarity}">
                ${renderElementBadge(ring.element)}
                ${renderItemArtwork("ring", ring.definitionId)}
                <strong>${escapeHtml(t(ring.nameKey))}</strong>
                <dl class="inline-stats">
                  ${stat(t("ui.energy"), String(ring.energyCost))}
                  ${stat(t("ui.damage"), String(ringTotalDamage(ring)))}
                  ${stat(t("ui.cooldown"), `${ring.currentCooldown}/${ring.cooldown}`)}
                </dl>
                ${renderGemList(ring)}
              </li>
            `,
          )
          .join("")}
      </ul>

      <h4>${escapeHtml(t("ui.monsters"))}</h4>
      <ul class="object-list">
        ${
          player.monsters.length > 0
            ? player.monsters
                .map(
                  (monster) => `
                    <li class="monster-item ${rarityClass(monster.rarity)}" data-rarity="${monster.rarity}">
                      ${renderElementBadge(monster.element)}
                      ${renderItemArtwork("monster", monster.definitionId)}
                      <strong>${escapeHtml(t(monster.nameKey))}</strong>
                      <span>${escapeHtml(t("ui.health"))} ${monster.health}/${monster.maxHealth}</span>
                      <span>${escapeHtml(t("ui.cooldown"))} ${monster.currentCooldown}</span>
                      ${renderSkillBadges(monster)}
                    </li>
                  `,
                )
                .join("")
            : `<li class="muted">${escapeHtml(t("ui.noMonster"))}</li>`
        }
      </ul>
    </article>
  `;
}

function renderSetupPlayer(player: BattlePlayerView): string {
  return `
    <article class="player-card">
      <h3>${escapeHtml(player.username)}</h3>
      <dl>
        ${stat(t("ui.level"), String(player.level))}
        ${stat(t("ui.health"), `${player.hero.health}/${player.hero.maxHealth}`)}
        ${stat(t("ui.speed"), String(player.hero.speed))}
      </dl>

      <h4>${escapeHtml(t("ui.rings"))}</h4>
      <ul class="object-list">
        ${player.rings
          .map(
            (ring) => `
              <li class="ring-item ${rarityClass(ring.rarity)}" data-rarity="${ring.rarity}">
                ${renderElementBadge(ring.element)}
                ${renderItemArtwork("ring", ring.definitionId)}
                <strong>${escapeHtml(t(ring.nameKey))}</strong>
                <dl class="inline-stats">
                  ${stat(t("ui.energy"), String(ring.energyCost))}
                  ${stat(t("ui.damage"), String(ringTotalDamage(ring)))}
                  ${stat(t("ui.cooldown"), String(ring.cooldown))}
                </dl>
                ${renderGemList(ring)}
              </li>
            `,
          )
          .join("")}
      </ul>
    </article>
  `;
}

function renderGemList(ring: RingView): string {
  if (ring.gems.length === 0) {
    return `<p class="muted">${escapeHtml(t("ui.noGem"))}</p>`;
  }

  return `
    <div class="gem-list" aria-label="${escapeHtml(t("ui.gems"))}">
      ${ring.gems.map(renderGem).join("")}
    </div>
  `;
}

function renderGem(gem: GemView): string {
  return `
    <article class="gem-item ${rarityClass(gem.rarity)}" data-rarity="${gem.rarity}">
      ${renderElementBadge(gem.element)}
      ${renderItemArtwork("gem", gem.definitionId)}
      <strong>${escapeHtml(t(gem.nameKey))}</strong>
      <dl class="inline-stats compact">
        ${stat(t("ui.damage"), String(gem.damage))}
        ${stat(t("ui.energyPenalty"), String(gem.energyPenalty))}
        ${stat(t("ui.cooldownPenalty"), String(gem.cooldownPenalty))}
      </dl>
      <span>${escapeHtml(t("ui.enchantment"))}: ${escapeHtml(enchantmentLabel(gem))}</span>
    </article>
  `;
}

function renderItemArtwork(kind: ItemAssetKind, definitionId: string): string {
  return `<span class="item-artwork ${kind}-artwork" style="${itemArtworkStyle(
    kind,
    definitionId,
  )}" aria-hidden="true"></span>`;
}

function renderSkillBadges(monster: MonsterView): string {
  if (!monster.skill) {
    return "";
  }

  const stateKey =
    monster.skill === "shield"
      ? monster.shieldActive
        ? "ui.skillState.active"
        : "ui.skillState.broken"
      : monster.skill === "rage"
        ? monster.rageActive
          ? "ui.skillState.active"
          : "ui.skillState.inactive"
        : null;
  const label = stateKey
    ? `${t(`ui.skill.${monster.skill}`)} - ${t(stateKey)}`
    : t(`ui.skill.${monster.skill}`);

  return `
    <span class="skill-list">
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function rarityClass(rarity: Rarity): string {
  return `rarity-${rarity}`;
}

function renderElementBadge(element: ElementType): string {
  const label = t(`ui.element.${element}`);
  return `<span class="element-badge element-${element}" title="${escapeHtml(
    label,
  )}">${escapeHtml(label)}</span>`;
}

function enchantmentLabel(gem: GemView): string {
  if (!gem.enchantment) {
    return t("ui.none");
  }

  if (gem.enchantment.type === "spell") {
    const spell =
      state.definitions.spells[gem.enchantment.resolvedDefinitionId ?? gem.enchantment.spellId];
    return `${t("ui.spell")}: ${spell ? t(spell.nameKey) : gem.enchantment.spellId}`;
  }

  const monster =
    state.definitions.monsters[gem.enchantment.resolvedDefinitionId ?? gem.enchantment.monsterId];
  return `${t("ui.monster")}: ${monster ? t(monster.nameKey) : gem.enchantment.monsterId}`;
}

function ringTotalDamage(ring: RingView): number {
  return ring.damage + ring.gems.reduce((sum, gem) => sum + gem.damage, 0);
}

function selectedBoardRing(): RingView | null {
  const activePlayer = getActivePlayer();
  return activePlayer?.rings.find((ring) => ring.id === selectedRingInstanceId) ?? null;
}

function selectedBoardMonster(): MonsterView | null {
  const activePlayer = getActivePlayer();
  return activePlayer?.monsters.find((monster) => monster.id === selectedMonsterInstanceId) ?? null;
}

function renderAction(action: BattleAction, index: number, currentIndex = actionIndex): string {
  const className = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
  const label = t(`ui.action.${action.type}`);
  const detail =
    action.type === "useRing"
      ? `${action.playerId} - ${action.ringInstanceId} -> ${action.targetId}`
      : action.type === "useMonster"
        ? `${action.playerId} - ${action.monsterInstanceId} -> ${action.targetId}`
        : "element" in action
          ? `${action.playerId} - ${action.element}`
          : action.playerId;

  return `
    <li class="${className}">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </li>
  `;
}

function renderEvent(event: BattleEvent): string {
  return `
    <li class="event-item">
      <div>
        <strong>${escapeHtml(t(`event.type.${event.type}`))}</strong>
        <code>${escapeHtml(event.type)}</code>
      </div>
      <span>${escapeHtml(eventMessage(event))}</span>
      ${eventDetails(event)}
    </li>
  `;
}

function eventMessage(event: BattleEvent): string {
  switch (event.type) {
    case "battleStarted":
      return formatMessage("event.battleStarted", { battleId: event.battleId });
    case "firstPlayerChoiceRequested":
      return formatMessage("event.firstPlayerChoiceRequested", {
        players: event.playerIds.map(playerLabel).join(t("ui.listSeparator")),
      });
    case "elementChosen":
      return formatMessage("event.elementChosen", {
        player: playerLabel(event.playerId),
        element: t(`ui.element.${event.element}`),
      });
    case "elementDuelTied":
      return formatMessage("event.elementDuelTied", {
        element: t(`ui.element.${event.element}`),
      });
    case "firstPlayerChosen":
      return formatMessage(`event.firstPlayerChosen.${event.reason}`, {
        player: playerLabel(event.playerId),
      });
    case "turnStarted":
      return formatMessage("event.turnStarted", {
        player: playerLabel(event.playerId),
        turnCount: String(event.turnCount),
        energy: String(event.energy),
      });
    case "cooldownChanged":
      return formatMessage("event.cooldownChanged", {
        target: combatObjectLabel(event.targetId),
        from: String(event.from),
        to: String(event.to),
      });
    case "ringUsed":
      return formatMessage("event.ringUsed", {
        player: playerLabel(event.playerId),
        ring: ringLabel(event.ringInstanceId),
        target: targetLabel(event.targetId),
      });
    case "energySpent":
      return formatMessage("event.energySpent", {
        player: playerLabel(event.playerId),
        amount: String(event.amount),
        remaining: String(event.remaining),
      });
    case "damageDealt":
      return formatMessage("event.damageDealt", {
        amount: String(event.amount),
        target: targetLabel(event.targetId),
        element: event.element ? t(`ui.element.${event.element}`) : t("ui.none"),
      });
    case "spellCast":
      return formatMessage("event.spellCast", {
        spell: spellLabel(event.spellId),
        target: targetLabel(event.targetId),
      });
    case "monsterSummoned":
      return formatMessage("event.monsterSummoned", {
        player: playerLabel(event.playerId),
        monster: monsterDefinitionLabel(event.monsterId),
      });
    case "monsterUsed":
      return formatMessage("event.monsterUsed", {
        player: playerLabel(event.playerId),
        monster: combatObjectLabel(event.monsterInstanceId),
        target: targetLabel(event.targetId),
      });
    case "shieldBroken":
      return formatMessage("event.shieldBroken", {
        monster: combatObjectLabel(event.monsterInstanceId),
        source: combatObjectLabel(event.sourceId),
      });
    case "pierceOverflow":
      return formatMessage("event.pierceOverflow", {
        monster: combatObjectLabel(event.monsterInstanceId),
        amount: String(event.amount),
        hero: targetLabel(event.targetHeroId),
      });
    case "hasteActivated":
      return formatMessage("event.hasteActivated", {
        monster: combatObjectLabel(event.monsterInstanceId),
      });
    case "rageActivated":
      return formatMessage("event.rageActivated", {
        monster: combatObjectLabel(event.monsterInstanceId),
        previousDamage: String(event.previousDamage),
        damage: String(event.damage),
      });
    case "multiHitResolved":
      return formatMessage("event.multiHitResolved", {
        monster: combatObjectLabel(event.monsterInstanceId),
        count: String(event.targetIds.length),
      });
    case "monsterDestroyed":
      return formatMessage("event.monsterDestroyed", {
        monster: combatObjectLabel(event.monsterInstanceId),
      });
    case "turnEnded":
      return formatMessage("event.turnEnded", {
        player: playerLabel(event.playerId),
      });
    case "battleEnded":
      return battleResultMessage(event.result);
  }
}

function eventDetails(event: BattleEvent): string {
  const details = eventTechnicalDetails(event);
  if (details.length === 0) {
    return "";
  }

  return `
    <dl class="event-details">
      ${details.map(([label, value]) => stat(t(label), value)).join("")}
    </dl>
  `;
}

function eventTechnicalDetails(event: BattleEvent): Array<[string, string]> {
  switch (event.type) {
    case "battleStarted":
      return [["ui.battle", event.battleId]];
    case "ringUsed":
      return [
        ["ui.ringId", event.ringInstanceId],
        ["ui.targetId", event.targetId],
      ];
    case "spellCast":
      return [
        ["ui.spellId", event.spellId],
        ["ui.gemId", event.sourceGemId],
        ["ui.targetId", event.targetId],
      ];
    case "monsterSummoned":
      return [
        ["ui.monsterId", event.monsterId],
        ["ui.monsterInstanceId", event.monsterInstanceId],
      ];
    case "monsterUsed":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.targetId", event.targetId],
      ];
    case "shieldBroken":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.sourceId", event.sourceId],
      ];
    case "pierceOverflow":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.targetId", event.targetHeroId],
      ];
    case "hasteActivated":
    case "rageActivated":
      return [["ui.monsterInstanceId", event.monsterInstanceId]];
    case "multiHitResolved":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.targetId", event.targetIds.join(t("ui.listSeparator"))],
      ];
    case "monsterDestroyed":
      return [["ui.monsterInstanceId", event.monsterInstanceId]];
    case "damageDealt":
      return [
        ["ui.sourceId", event.sourceId],
        ["ui.targetId", event.targetId],
      ];
    case "cooldownChanged":
      return [["ui.targetId", event.targetId]];
    default:
      return [];
  }
}

function battleResultMessage(result: BattleResult): string {
  if (result.type === "draw") {
    return t("event.battleEnded.draw");
  }

  return formatMessage("event.battleEnded.winner", {
    winner: playerLabel(result.winnerId),
    loser: playerLabel(result.loserId),
  });
}

function formatMessage(key: string, values: Record<string, string>): string {
  return t(key).replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `{${name}}`);
}

function playerLabel(playerId: string): string {
  return state.players.find((player) => player.id === playerId)?.username ?? playerId;
}

function targetLabel(targetId: TargetId): string {
  if (targetId.endsWith(".hero")) {
    return `${playerLabel(targetId.slice(0, -".hero".length))} ${t("ui.hero")}`;
  }

  return combatObjectLabel(targetId);
}

function combatObjectLabel(objectId: string): string {
  for (const player of state.players) {
    const ring = player.rings.find((candidate) => candidate.id === objectId);
    if (ring) {
      return t(ring.nameKey);
    }

    const monster = player.monsters.find((candidate) => candidate.id === objectId);
    if (monster) {
      return t(monster.nameKey);
    }
  }

  return objectId;
}

function ringLabel(ringInstanceId: string): string {
  return combatObjectLabel(ringInstanceId);
}

function spellLabel(spellId: string): string {
  const spell = state.definitions.spells[spellId];
  return spell ? t(spell.nameKey) : spellId;
}

function monsterDefinitionLabel(monsterId: string): string {
  const monster = state.definitions.monsters[monsterId];
  return monster ? t(monster.nameKey) : monsterId;
}

function getActivePlayer(): BattlePlayerView | null {
  return state.players.find((player) => player.id === state.activePlayerId) ?? null;
}

function targetOptions(): TargetOption[] {
  return state.players.flatMap((player) => [
    createTargetOption(`${player.id}.hero` as TargetId, `${player.username} - ${t("ui.hero")}`),
    ...player.monsters.map((monster) =>
      createTargetOption(
        monster.id as TargetId,
        `${player.username} - ${t(monster.nameKey)}${hasTaunt(monster) ? ` (${t("ui.skill.taunt")})` : ""}`,
      ),
    ),
  ]);
}

function createTargetOption(id: TargetId, baseLabel: string): TargetOption {
  const reasonKey = targetDisabledReason(id);
  return {
    id,
    label: reasonKey ? `${baseLabel} - ${t(reasonKey)}` : baseLabel,
    disabled: Boolean(reasonKey),
    reasonKey,
  };
}

function targetDisabledReason(targetId: TargetId): string | undefined {
  if (isReplayLocked()) {
    return "ui.replayInProgress";
  }

  const activePlayer = getActivePlayer();
  const target = findTarget(targetId);
  if (!activePlayer || !target || target.player.id === activePlayer.id) {
    return undefined;
  }

  const tauntMonsters = target.player.monsters.filter(hasTaunt);
  if (tauntMonsters.length === 0) {
    return undefined;
  }

  if (target.kind === "monster" && hasTaunt(target.monster)) {
    return undefined;
  }

  return "ui.targetBlockedByTaunt";
}

function isReplayLocked(): boolean {
  return Boolean(replayRecord && replayActionIndex < replayRecord.actions.length);
}

function targetSelectionNotice(targets: TargetOption[]): string | null {
  return targets.some((target) => target.reasonKey === "ui.targetBlockedByTaunt")
    ? t("ui.tauntTargetNotice")
    : null;
}

function defaultTargetId(): TargetId {
  const activePlayer = getActivePlayer();
  const opponent = state.players.find((player) => player.id !== activePlayer?.id);
  const targets = targetOptions();
  const opponentTarget = targets.find(
    (target) => !target.disabled && opponent && target.id.startsWith(`${opponent.id}.`),
  );
  const fallbackTarget = targets.find((target) => !target.disabled) ?? targets[0];

  return opponentTarget?.id ?? fallbackTarget.id;
}

function ensureValidManualTarget(): void {
  if (state.status !== "active") {
    return;
  }

  const targets = targetOptions();
  const selectedTarget = targets.find((target) => target.id === manualTargetId);
  if (!selectedTarget || selectedTarget.disabled) {
    manualTargetId = defaultTargetId();
  }
}

function ensureValidSelectedRing(): void {
  if (!selectedRingInstanceId) {
    return;
  }

  const activePlayer = getActivePlayer();
  const ring = activePlayer?.rings.find((candidate) => candidate.id === selectedRingInstanceId);
  if (!ring || boardRingUnavailableReason(ring, activePlayer)) {
    selectedRingInstanceId = null;
  }
}

function ensureValidSelectedMonster(): void {
  if (!selectedMonsterInstanceId) {
    return;
  }

  const monster = activePlayerMonster(selectedMonsterInstanceId);
  if (!monster || boardMonsterUnavailableReason(monster.monster, monster.player)) {
    selectedMonsterInstanceId = null;
  }
}

function activePlayerMonster(
  monsterInstanceId: string,
): { player: BattlePlayerView; monster: MonsterView } | null {
  const activePlayer = getActivePlayer();
  const monster = activePlayer?.monsters.find((candidate) => candidate.id === monsterInstanceId);
  return activePlayer && monster ? { player: activePlayer, monster } : null;
}

function findTarget(
  targetId: TargetId,
):
  | { kind: "hero"; player: BattlePlayerView }
  | { kind: "monster"; player: BattlePlayerView; monster: MonsterView }
  | null {
  if (targetId.endsWith(".hero")) {
    const playerId = targetId.slice(0, -".hero".length);
    const player = state.players.find((candidate) => candidate.id === playerId);
    return player ? { kind: "hero", player } : null;
  }

  for (const player of state.players) {
    const monster = player.monsters.find((candidate) => candidate.id === targetId);
    if (monster) {
      return { kind: "monster", player, monster };
    }
  }

  return null;
}

function hasTaunt(monster: MonsterView): boolean {
  return monster.skill === "taunt";
}

function stat(label: string, value: string): string {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
