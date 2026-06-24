import {
  createBattleSetupFromFixture,
  fixtures,
  locales,
  validateContent,
} from "@battleness/content";
import {
  applyBattleAction,
  createBattleState,
  type BattleAction,
  type BattleState,
  type TargetId,
} from "@battleness/engine";
import "./styles.css";

validateContent();

type Scenario = (typeof fixtures.scenarios)[number];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Prototype app root was not found.");
}

const root = app;
let selectedScenarioId = fixtures.scenarios[0]?.id ?? "";
let state = createState();
let actionIndex = 0;
let errorMessage: string | null = null;
let manualTargetId: TargetId = "playerTwo.hero";

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
  const scenario = currentScenario();
  const remainingActions = Math.max(0, scenario.actions.length - actionIndex);
  ensureValidManualTarget();

  root.innerHTML = `
    <section class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">BattleNess</p>
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
        <button id="nextAction" ${remainingActions === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.nextAction"))}
        </button>
        <button id="runAll" ${remainingActions === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.runAll"))}
        </button>
        <button id="resetScenario">${escapeHtml(t("ui.reset"))}</button>
      </section>

      ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ""}

      <main class="layout">
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
            ${scenario.actions.map((action, index) => renderAction(action as BattleAction, index)).join("")}
          </ol>
        </section>

        <section class="panel log">
          <h2>${escapeHtml(t("ui.eventLog"))}</h2>
          <ol>
            ${state.log
              .slice()
              .reverse()
              .map(
                (event) =>
                  `<li><code>${escapeHtml(event.type)}</code> ${escapeHtml(JSON.stringify(event))}</li>`,
              )
              .join("")}
          </ol>
        </section>
      </main>
    </section>
  `;

  bindEvents();
}

function bindEvents(): void {
  document
    .querySelector<HTMLSelectElement>("#scenarioSelect")
    ?.addEventListener("change", (event) => {
      selectedScenarioId = (event.currentTarget as HTMLSelectElement).value;
      resetScenario();
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
    .querySelector<HTMLSelectElement>("#manualTarget")
    ?.addEventListener("change", (event) => {
      manualTargetId = (event.currentTarget as HTMLSelectElement).value as TargetId;
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

function resetScenario(): void {
  state = createState();
  actionIndex = 0;
  errorMessage = null;
  manualTargetId = defaultTargetId();
}

function renderManualActions(): string {
  const activePlayer = getActivePlayer();
  const isFinished = state.status === "finished";

  if (!activePlayer) {
    return `
      <h2>${escapeHtml(t("ui.manualActions"))}</h2>
      <p class="muted">${escapeHtml(t("ui.status"))}: ${escapeHtml(state.status)}</p>
    `;
  }

  return `
    <h2>${escapeHtml(t("ui.manualActions"))}</h2>
    <label class="target-picker">
      <span>${escapeHtml(t("ui.target"))}</span>
      <select id="manualTarget" ${isFinished ? "disabled" : ""}>
        ${targetOptions()
          .map(
            (target) => `
              <option value="${escapeHtml(target.id)}" ${
                target.id === manualTargetId ? "selected" : ""
              }>
                ${escapeHtml(target.label)}
              </option>
            `,
          )
          .join("")}
      </select>
    </label>

    <h4>${escapeHtml(t("ui.rings"))}</h4>
    <div class="button-list">
      ${activePlayer.rings
        .map((ring) => {
          const disabled =
            isFinished || ring.currentCooldown > 0 || activePlayer.energy.current < ring.energyCost;
          return `
            <button data-manual-ring-id="${escapeHtml(ring.id)}" ${disabled ? "disabled" : ""}>
              ${escapeHtml(t(ring.nameKey))} - ${escapeHtml(t("ui.energy"))} ${ring.energyCost}
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
                  <button data-manual-monster-id="${escapeHtml(monster.id)}" ${
                    disabled ? "disabled" : ""
                  }>
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

function useManualRing(ringInstanceId: string): void {
  const activePlayer = getActivePlayer();
  if (!activePlayer) {
    return;
  }

  const ring = activePlayer.rings.find((candidate) => candidate.id === ringInstanceId);
  if (!ring) {
    return;
  }

  const enchantmentTargets = Object.fromEntries(
    ring.gems
      .filter((gem) => gem.enchantment?.type === "spell")
      .map((gem) => [gem.id, manualTargetId]),
  );

  applyManualAction({
    type: "useRing",
    playerId: activePlayer.id,
    ringInstanceId,
    targetId: manualTargetId,
    enchantmentTargets,
  });
}

function useManualMonster(monsterInstanceId: string): void {
  const activePlayer = getActivePlayer();
  if (!activePlayer) {
    return;
  }

  applyManualAction({
    type: "useMonster",
    playerId: activePlayer.id,
    monsterInstanceId,
    targetId: manualTargetId,
  });
}

function applyManualAction(action: BattleAction): void {
  try {
    state = applyBattleAction(state, action).state;
    errorMessage = null;
    ensureValidManualTarget();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }
}

function renderPlayer(player: BattleState["players"][number]): string {
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
              <li>
                <strong>${escapeHtml(t(ring.nameKey))}</strong>
                <span>${escapeHtml(t("ui.energy"))} ${ring.energyCost}</span>
                <span>${escapeHtml(t("ui.cooldown"))} ${ring.currentCooldown}</span>
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
                    <li>
                      <strong>${escapeHtml(t(monster.nameKey))}</strong>
                      <span>${escapeHtml(t("ui.health"))} ${monster.health}/${monster.maxHealth}</span>
                      <span>${escapeHtml(t("ui.cooldown"))} ${monster.currentCooldown}</span>
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

function renderAction(action: BattleAction, index: number): string {
  const className = index < actionIndex ? "done" : index === actionIndex ? "current" : "";
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

function getActivePlayer(): BattleState["players"][number] | null {
  return state.players.find((player) => player.id === state.activePlayerId) ?? null;
}

function targetOptions(): Array<{ id: TargetId; label: string }> {
  return state.players.flatMap((player) => [
    {
      id: `${player.id}.hero` as TargetId,
      label: `${player.username} - ${t("ui.hero")}`,
    },
    ...player.monsters.map((monster) => ({
      id: monster.id as TargetId,
      label: `${player.username} - ${t(monster.nameKey)}`,
    })),
  ]);
}

function defaultTargetId(): TargetId {
  const activePlayer = getActivePlayer();
  const opponent = state.players.find((player) => player.id !== activePlayer?.id);
  return `${opponent?.id ?? state.players[0].id}.hero` as TargetId;
}

function ensureValidManualTarget(): void {
  const targets = targetOptions();
  if (!targets.some((target) => target.id === manualTargetId)) {
    manualTargetId = defaultTargetId();
  }
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
