import {
  contentVersion,
  canCraftRecipe,
  createBattleSetupFromFixture,
  createBattleSetupFromLab,
  createBalanceReport,
  craftRecipe,
  definitions,
  fixtures,
  experienceForLevel,
  improveCraftedItemQuality,
  improveRingSocketCount,
  levelFromExperience,
  locales,
  MAX_LEVEL,
  parseBattleLabConfigJson,
  serializeBattleLabConfig,
  qualityImprovementCost,
  resolveItemStat,
  socketImprovementCost,
  validateContent,
  type BattleLabConfig,
  type BattleLabEnchantmentConfig,
  type BattleLabGemConfig,
  type BattleLabRingConfig,
  type BalanceItemKind,
  type BalanceItemReport,
  type BalanceMetricId,
  type BalanceProfileId,
  type BalanceWarning,
  type CraftedItemInstance,
  type ImprovementRarity,
  type RecipeDefinition,
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
import {
  deleteBattleLabPreset,
  listBattleLabPresets,
  loadBattleLabPreset,
  saveBattleLabPreset,
} from "./battleLabPresets";
import { runBattleLabBatch, type BattleLabSimulationResult } from "./battleLabSimulation";
import {
  createDefaultDevelopmentInventory,
  loadDevelopmentInventory,
  parseDevelopmentInventoryJson,
  saveDevelopmentInventory,
  serializeDevelopmentInventory,
} from "./devInventory";
import {
  deleteDevelopmentLoadout,
  listDevelopmentLoadouts,
  saveDevelopmentLoadout,
  type DevelopmentLoadout,
} from "./devLoadouts";
import { itemArtworkStyle, validateItemAssets, type ItemAssetKind } from "./itemAssets";
import { clearIncompatibleDevelopmentStorage } from "./developmentStorageVersion";
import "./styles.css";

validateContent();
validateItemAssets();

type Scenario = (typeof fixtures.scenarios)[number];
type BattlePlayerView = BattleState["players"][number];
type RingView = BattlePlayerView["rings"][number];
type GemView = RingView["gems"][number];
type MonsterView = BattlePlayerView["monsters"][number];
type SetupMode = "battleLab" | "scenario";
type BattleLabItemSourceMode = "free" | "inventory";
type InventoryTypeFilter = "all" | CraftedItemInstance["type"];
type InventoryRarityFilter = "all" | Rarity;
type InventoryElementFilter = "all" | ElementType;
type BattleLabFeedback = {
  type: "error" | "success";
  message: string;
};
type ForgeFeedback = {
  type: "error" | "success";
  message: string;
};
type BattleRewardMaterial = {
  materialId: string;
  quantity: number;
};
type BattleRewardItemXp = {
  sourceInstanceId: string;
  type: CraftedItemInstance["type"];
  xp: number;
};
type BattleRewardPreview = {
  credits: number;
  materials: BattleRewardMaterial[];
  itemXp: BattleRewardItemXp[];
  reasonKey: string;
};
type BattleResultSummary = {
  resultLabel: string;
  turnCount: number;
  actionCount: number;
  damageByPlayer: Array<{ playerId: string; playerName: string; damage: number }>;
  ringsUsed: Array<{ id: string; label: string; count: number }>;
  spellsCast: Array<{ id: string; label: string; count: number }>;
  monstersSummoned: Array<{ id: string; label: string; count: number }>;
  monstersUsed: Array<{ id: string; label: string; count: number }>;
  itemXp: BattleRewardItemXp[];
  rewardsStatusKey: string;
};
type BattleSourceMap = {
  rings: Map<string, string>;
  gems: Map<string, string>;
  ringGemIds: Map<string, string[]>;
  enchantments: Map<string, { type: "monster" | "spell"; sourceInstanceId: string }>;
  ringMonsterEnchantments: Map<string, Array<{ definitionId: string; sourceInstanceId: string }>>;
};
type TargetOption = {
  id: TargetId;
  label: string;
  disabled: boolean;
  reasonKey?: string;
};
const elementTypes = ["fire", "ice", "electric"] as const satisfies readonly ElementType[];
const EQUIPPED_ITEM_XP_REWARD = 8;
const USED_ITEM_XP_REWARD = 20;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Prototype app root was not found.");
}

const root = app;
const developmentStorageWasReset = clearIncompatibleDevelopmentStorage();
let selectedScenarioId = fixtures.scenarios[0]?.id ?? "";
let setupMode: SetupMode = "scenario";
let battleLabItemSourceMode: BattleLabItemSourceMode = "free";
const battleLabConfig = createDefaultBattleLabConfig();
let battleLabJsonText = "";
let battleLabFeedback: BattleLabFeedback | null = null;
let battleLabSimulationResults: BattleLabSimulationResult[] = [];
let selectedForgeRecipeId = definitions.recipes[0]?.id ?? "";
let developmentInventory = loadDevelopmentInventory(definitions.materials);
let forgeInventoryJsonText = "";
let forgeFeedback: ForgeFeedback | null = null;
let inventoryTypeFilter: InventoryTypeFilter = "all";
let inventoryRarityFilter: InventoryRarityFilter = "all";
let inventoryElementFilter: InventoryElementFilter = "all";
let inventoryFeedback: ForgeFeedback | null = null;
let selectedLoadoutRingIds: string[] = [];
let developmentLoadoutName = "Starter loadout";
let loadoutFeedback: ForgeFeedback | null = null;
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
let battleRewardsClaimed = false;

render();

function createState(): BattleState {
  if (setupMode === "battleLab") {
    return createBattleState(createBattleSetupFromLab(battleLabConfig));
  }

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
  const displayedActions =
    replayRecord?.actions ??
    (setupMode === "battleLab" ? [] : (scenario.actions as readonly BattleAction[]));
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
        ${
          setupMode === "scenario"
            ? `
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
            `
            : `
              <div class="battle-mode-label">
                <span>${escapeHtml(t("ui.setupMode"))}</span>
                <strong>${escapeHtml(t("ui.battleLab"))}</strong>
              </div>
            `
        }
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

      ${renderBattleResultSummaryPanel()}

      ${renderBattleRewardsPanel()}

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
            ${
              displayedActions.length > 0
                ? displayedActions
                    .map((action, index) => renderAction(action, index, displayedActionIndex))
                    .join("")
                : `<li class="muted">${escapeHtml(t("ui.noScriptedActions"))}</li>`
            }
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
  const setup =
    setupMode === "battleLab"
      ? createBattleSetupFromLab(battleLabConfig)
      : createBattleSetupFromFixture(scenario.battleSetupId ?? "basicDuel");
  const playerNames = setup.players.map((player) => player.username).join(t("ui.listSeparator"));
  const setupActions = setupMode === "battleLab" ? [] : scenario.actions;

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
        <div class="setup-pickers">
          <label class="scenario-picker">
            <span>${escapeHtml(t("ui.setupMode"))}</span>
            <select id="setupMode">
              <option value="scenario" ${setupMode === "scenario" ? "selected" : ""}>
                ${escapeHtml(t("ui.scenarioMode"))}
              </option>
              <option value="battleLab" ${setupMode === "battleLab" ? "selected" : ""}>
                ${escapeHtml(t("ui.battleLab"))}
              </option>
            </select>
          </label>
          ${
            setupMode === "scenario"
              ? `
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
              `
              : ""
          }
        </div>
      </header>

      ${
        developmentStorageWasReset
          ? `<p class="lab-feedback success">${escapeHtml(t("ui.developmentStorageResetV2"))}</p>`
          : ""
      }

      <main class="setup-layout">
        <section class="panel setup-summary">
          <h2>${escapeHtml(t("ui.battleSetup"))}</h2>
          <dl class="setup-stats">
            ${stat(t("ui.battle"), setup.id)}
            ${stat(
              t("ui.setupMode"),
              setupMode === "battleLab" ? t("ui.battleLab") : t(scenario.descriptionKey),
            )}
            ${stat(t("ui.players"), playerNames)}
            ${stat(t("ui.seed"), setup.seed)}
          </dl>
          <div class="controls setup-controls">
            <button id="startBattle">${escapeHtml(t("ui.startBattle"))}</button>
          </div>
        </section>

        ${setupMode === "battleLab" ? renderBattleLabEditor() : ""}

        ${renderContentBalanceReportPanel()}

        ${renderForgePanel()}

        ${renderDevelopmentInventoryPanel()}

        <section class="panel players">
          <h2>${escapeHtml(t("ui.players"))}</h2>
          <div class="player-grid">
            ${setup.players.map(renderSetupPlayer).join("")}
          </div>
        </section>

        <section class="panel actions">
          <h2>${escapeHtml(t("ui.remainingActions"))}</h2>
          <ol>
            ${
              setupActions.length > 0
                ? setupActions
                    .map((action, index) => renderAction(action as BattleAction, index))
                    .join("")
                : `<li class="muted">${escapeHtml(t("ui.noScriptedActions"))}</li>`
            }
          </ol>
        </section>

        ${renderAssetCollection()}
      </main>
    </section>
  `;

  bindEvents();
}

function createDefaultBattleLabConfig(): BattleLabConfig {
  return {
    id: "battleLab",
    seed: "battle-lab-seed",
    players: [
      {
        id: "labPlayerOne",
        username: "Player One",
        level: 1,
        rings: [
          {
            definitionId: "staticLoop",
            level: 1,
            quality: 0,
            gems: [
              {
                definitionId: "sparkPrism",
                level: 1,
                quality: 0,
                enchantment: {
                  type: "spell",
                  definitionId: "electroshock",
                  level: 1,
                  quality: 0,
                },
              },
            ],
          },
        ],
      },
      {
        id: "labPlayerTwo",
        username: "Player Two",
        level: 1,
        rings: [
          {
            definitionId: "rimeLoop",
            level: 1,
            quality: 0,
            gems: [
              {
                definitionId: "frostChip",
                level: 1,
                quality: 0,
                enchantment: {
                  type: "spell",
                  definitionId: "deepFreezing",
                  level: 1,
                  quality: 0,
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function renderBattleLabEditor(): string {
  const setup = createBattleSetupFromLab(battleLabConfig);

  return `
    <section class="panel battle-lab-editor">
      <div class="battle-lab-heading">
        <h2>${escapeHtml(t("ui.battleLab"))}</h2>
        <div class="battle-lab-heading-controls">
          <label>
            <span>${escapeHtml(t("ui.itemSourceMode"))}</span>
            <select id="battleLabItemSourceMode">
              <option value="free" ${battleLabItemSourceMode === "free" ? "selected" : ""}>
                ${escapeHtml(t("ui.freeEdit"))}
              </option>
              <option
                value="inventory"
                ${battleLabItemSourceMode === "inventory" ? "selected" : ""}
              >
                ${escapeHtml(t("ui.developmentInventory"))}
              </option>
            </select>
          </label>
          <label>
            <span>${escapeHtml(t("ui.seed"))}</span>
            <input data-lab-seed value="${escapeHtml(battleLabConfig.seed)}" />
          </label>
        </div>
      </div>
      ${renderBattleLabPresetTools()}
      <div class="battle-lab-players">
        ${battleLabConfig.players.map(renderBattleLabPlayer).join("")}
      </div>
      ${renderBattleLabBalance(setup.players)}
    </section>
  `;
}

function renderBattleLabPresetTools(): string {
  const presets = listBattleLabPresets();

  return `
    <section class="battle-lab-tools">
      <div class="preset-controls">
        <label>
          <span>${escapeHtml(t("ui.presetName"))}</span>
          <input id="battleLabPresetName" placeholder="${escapeHtml(t("ui.presetName"))}" />
        </label>
        <button id="saveBattleLabPreset">${escapeHtml(t("ui.savePreset"))}</button>
        <label>
          <span>${escapeHtml(t("ui.savedPresets"))}</span>
          <select id="battleLabPresetSelect" ${presets.length === 0 ? "disabled" : ""}>
            ${
              presets.length > 0
                ? presets
                    .map(
                      (preset) =>
                        `<option value="${escapeHtml(preset.name)}">${escapeHtml(preset.name)}</option>`,
                    )
                    .join("")
                : `<option value="">${escapeHtml(t("ui.noSavedPresets"))}</option>`
            }
          </select>
        </label>
        <button id="loadBattleLabPreset" ${presets.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.loadPreset"))}
        </button>
        <button id="deleteBattleLabPreset" ${presets.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.deletePreset"))}
        </button>
      </div>
      <label class="battle-lab-json">
        <span>${escapeHtml(t("ui.loadoutJson"))}</span>
        <textarea
          id="battleLabJson"
          placeholder="${escapeHtml(t("ui.loadoutJsonPlaceholder"))}"
          spellcheck="false"
        >${escapeHtml(battleLabJsonText)}</textarea>
      </label>
      <div class="battle-lab-json-actions">
        <button id="exportBattleLab">${escapeHtml(t("ui.exportLoadout"))}</button>
        <button id="importBattleLab">${escapeHtml(t("ui.importLoadout"))}</button>
      </div>
      ${
        battleLabFeedback
          ? `<p class="lab-feedback ${battleLabFeedback.type}">${escapeHtml(
              battleLabFeedback.message,
            )}</p>`
          : ""
      }
    </section>
  `;
}

function renderBattleLabBalance(players: BattleState["players"]): string {
  const summaries = players.map((player) => {
    const totalDamage = player.rings.reduce((sum, ring) => sum + ringTotalDamage(ring), 0);
    const totalEnergy = player.rings.reduce((sum, ring) => sum + ring.energyCost, 0);
    const totalCooldown = player.rings.reduce((sum, ring) => sum + ring.cooldown, 0);
    return {
      player,
      totalDamage,
      totalEnergy,
      totalCooldown,
      damagePerEnergy: totalEnergy === 0 ? 0 : totalDamage / totalEnergy,
      damagePerCooldown: totalCooldown === 0 ? 0 : totalDamage / totalCooldown,
    };
  });
  const warnings = balanceWarnings(summaries);

  return `
    <section class="balance-comparison">
      <h3>${escapeHtml(t("ui.balanceComparison"))}</h3>
      <div class="balance-player-grid">
        ${summaries
          .map(
            (summary) => `
              <article>
                <h4>${escapeHtml(summary.player.username)}</h4>
                <dl class="balance-summary">
                  ${stat(t("ui.rings"), String(summary.player.rings.length))}
                  ${stat(t("ui.health"), String(summary.player.hero.maxHealth))}
                  ${stat(t("ui.speed"), String(summary.player.hero.speed))}
                  ${stat(t("ui.totalDamage"), String(summary.totalDamage))}
                  ${stat(t("ui.totalEnergyCost"), String(summary.totalEnergy))}
                  ${stat(t("ui.damagePerEnergy"), summary.damagePerEnergy.toFixed(2))}
                  ${stat(t("ui.damagePerCooldown"), summary.damagePerCooldown.toFixed(2))}
                </dl>
                <div class="balance-ring-list">
                  ${summary.player.rings
                    .map(
                      (ring) => `
                        <div>
                          ${renderItemArtwork("ring", ring.definitionId)}
                          <strong>${escapeHtml(t(ring.nameKey))}</strong>
                          <span>${escapeHtml(t("ui.damage"))}: ${renderResolvedValue(ringTotalDamage(ring), baseRingTotalDamage(ring))}</span>
                          <span>${escapeHtml(t("ui.energy"))}: ${ring.energyCost}</span>
                          <span>${escapeHtml(t("ui.cooldown"))}: ${ring.cooldown}</span>
                        </div>
                      `,
                    )
                    .join("")}
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
      <div class="balance-warnings">
        <h4>${escapeHtml(t("ui.balanceWarnings"))}</h4>
        ${
          warnings.length > 0
            ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
            : `<p class="muted">${escapeHtml(t("ui.noBalanceWarnings"))}</p>`
        }
      </div>
      <div class="simulation-runner">
        <div>
          <h4>${escapeHtml(t("ui.batchSimulation"))}</h4>
          <button id="runBattleLabBatch">${escapeHtml(t("ui.runBatchSimulation"))}</button>
        </div>
        ${renderBattleLabSimulationResults()}
      </div>
    </section>
  `;
}

function renderBattleLabSimulationResults(): string {
  if (battleLabSimulationResults.length === 0) {
    return `<p class="muted">${escapeHtml(t("ui.noSimulationResults"))}</p>`;
  }

  return `
    <div class="simulation-table-wrap">
      <table class="simulation-table">
        <thead>
          <tr>
            <th>${escapeHtml(t("ui.preferredTieWinner"))}</th>
            <th>${escapeHtml(t("ui.actualStartingPlayer"))}</th>
            <th>${escapeHtml(t("ui.result"))}</th>
            <th>${escapeHtml(t("ui.actions"))}</th>
            <th>${escapeHtml(t("ui.turns"))}</th>
            <th>${escapeHtml(t("ui.finalHealth"))}</th>
          </tr>
        </thead>
        <tbody>
          ${battleLabSimulationResults
            .map(
              (result) => `
                <tr class="${result.timedOut ? "timed-out" : ""}">
                  <td>${escapeHtml(playerName(result.preferredTieWinnerId))}</td>
                  <td>${escapeHtml(
                    result.startingPlayerId ? playerName(result.startingPlayerId) : "-",
                  )}</td>
                  <td>${escapeHtml(simulationResultLabel(result))}</td>
                  <td>${result.actionCount}</td>
                  <td>${result.turnCount}</td>
                  <td>${escapeHtml(
                    Object.entries(result.finalHealth)
                      .map(([playerId, health]) => `${playerName(playerId)}: ${health}`)
                      .join(t("ui.listSeparator")),
                  )}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderContentBalanceReportPanel(): string {
  const report = createBalanceReport(definitions);

  return `
    <section class="panel content-balance-report">
      <div class="section-heading">
        <h2>${escapeHtml(t("ui.contentBalanceReport"))}</h2>
        <span>${escapeHtml(contentVersion)}</span>
      </div>
      <div class="balance-profile-grid">
        ${report.profiles
          .map(
            (profile) => `
              <article>
                <strong>${escapeHtml(balanceProfileLabel(profile.id))}</strong>
                <span>${escapeHtml(t("ui.level"))}: ${profile.level}</span>
                <span>${escapeHtml(t("ui.quality"))}: ${profile.quality}</span>
              </article>
            `,
          )
          .join("")}
      </div>
      <div class="content-balance-layout">
        <section>
          <h3>${escapeHtml(t("ui.balanceWarnings"))}</h3>
          ${renderContentBalanceWarnings(report.warnings)}
        </section>
        <section>
          <h3>${escapeHtml(t("ui.balanceComparison"))}</h3>
          <div class="balance-report-groups">
            ${(["ring", "gem", "spell", "monster"] as const)
              .map((kind) => renderBalanceItemGroup(kind, report.items))
              .join("")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderContentBalanceWarnings(warnings: readonly BalanceWarning[]): string {
  if (warnings.length === 0) {
    return `<p class="muted">${escapeHtml(t("ui.noContentBalanceWarnings"))}</p>`;
  }

  return `
    <ul class="content-balance-warnings">
      ${warnings
        .slice(0, 8)
        .map(
          (warning) => `
            <li>
              ${escapeHtml(
                formatMessage("ui.highOutlierWarning", {
                  item: balanceItemLabel(warning.kind, warning.itemId),
                  profile: balanceProfileLabel(warning.profileId),
                  metric: balanceMetricLabel(warning.metric),
                  value: formatMetricValue(warning.value),
                  average: formatMetricValue(warning.average),
                }),
              )}
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function renderBalanceItemGroup(
  kind: BalanceItemKind,
  items: readonly BalanceItemReport[],
): string {
  const groupItems = items.filter((item) => item.kind === kind);

  return `
    <article class="balance-report-group">
      <h4>${escapeHtml(t(`ui.${kind}s`))}</h4>
      <div class="balance-report-table-wrap">
        <table class="balance-report-table">
          <thead>
            <tr>
              <th>${escapeHtml(t(`ui.${kind}`))}</th>
              <th>${escapeHtml(t("ui.element"))}</th>
              <th>${escapeHtml(t("ui.rarity"))}</th>
              ${(["base", "mid", "max"] as const)
                .map((profileId) => `<th>${escapeHtml(balanceProfileLabel(profileId))}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${groupItems
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(t(item.nameKey))}</td>
                    <td>${escapeHtml(t(`ui.element.${item.element}`))}</td>
                    <td>${escapeHtml(t(`ui.rarity.${item.rarity}`))}</td>
                    ${(["base", "mid", "max"] as const)
                      .map((profileId) => {
                        const profile = item.profiles.find(
                          (candidate) => candidate.profileId === profileId,
                        );
                        return `<td>${escapeHtml(
                          profile
                            ? `${formatMetricValue(profile.primaryValue)} ${balanceMetricLabel(
                                profile.primaryMetric,
                              )}`
                            : "-",
                        )}</td>`;
                      })
                      .join("")}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function balanceItemLabel(kind: BalanceItemKind, itemId: string): string {
  const definition = itemDefinition(kind, itemId);
  return t(definition.nameKey);
}

function balanceProfileLabel(profileId: BalanceProfileId): string {
  return t(`ui.balanceProfile.${profileId}`);
}

function balanceMetricLabel(metric: BalanceMetricId): string {
  return t(`ui.balanceMetric.${metric}`);
}

function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderForgePanel(): string {
  const recipe = currentForgeRecipe();
  const output = forgeOutputDefinition(recipe);
  const canCraft = canCraftRecipe(recipe, developmentInventory.stock);

  return `
    <section class="panel forge-panel">
      <div class="forge-heading">
        <h2>${escapeHtml(t("ui.forge"))}</h2>
        <label>
          <span>${escapeHtml(t("ui.recipe"))}</span>
          <select id="forgeRecipeSelect">
            ${definitions.recipes
              .map(
                (candidate) => `
                  <option value="${escapeHtml(candidate.id)}" ${
                    candidate.id === recipe.id ? "selected" : ""
                  }>
                    ${escapeHtml(forgeRecipeLabel(candidate))}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
      </div>
      <div class="forge-layout">
        <article class="forge-output ${rarityClass(output.rarity as Rarity)}">
          ${output.element ? renderElementBadge(output.element as ElementType) : ""}
          ${renderItemArtwork(recipe.outputType, output.id)}
          <div>
            <strong>${escapeHtml(t(output.nameKey))}</strong>
            <span>${escapeHtml(t(`ui.rarity.${output.rarity}`))}</span>
            <span>${escapeHtml(
              formatMessage("ui.craftedLevelQuality", {
                level: String(recipe.craftedLevel),
                quality: String(recipe.craftedQuality),
              }),
            )}</span>
          </div>
        </article>
        <div class="forge-ingredients">
          <h3>${escapeHtml(t("ui.ingredients"))}</h3>
          ${recipe.ingredients.map(renderForgeIngredient).join("")}
        </div>
        <div class="forge-actions">
          <button id="craftSelectedRecipe" ${canCraft ? "" : "disabled"}>
            ${escapeHtml(t("ui.craft"))}
          </button>
          <button id="restockForge">${escapeHtml(t("ui.restockMaterials"))}</button>
          <button id="resetDevelopmentInventory">${escapeHtml(t("ui.resetInventory"))}</button>
          ${
            forgeFeedback
              ? `<p class="lab-feedback ${forgeFeedback.type}">${escapeHtml(
                  forgeFeedback.message,
                )}</p>`
              : ""
          }
        </div>
      </div>
      <div class="forge-inventory-tools">
        <label>
          <span>${escapeHtml(t("ui.developmentInventoryJson"))}</span>
          <textarea
            id="forgeInventoryJson"
            placeholder="${escapeHtml(t("ui.developmentInventoryJsonPlaceholder"))}"
            spellcheck="false"
          >${escapeHtml(forgeInventoryJsonText)}</textarea>
        </label>
        <div class="battle-lab-json-actions">
          <button id="exportDevelopmentInventory">${escapeHtml(t("ui.exportInventory"))}</button>
          <button id="importDevelopmentInventory">${escapeHtml(t("ui.importInventory"))}</button>
        </div>
      </div>
      <div class="crafted-items">
        <h3>${escapeHtml(t("ui.craftedItems"))}</h3>
        ${
          developmentInventory.craftedItems.length > 0
            ? `<ol>${developmentInventory.craftedItems.map(renderCraftedItem).join("")}</ol>`
            : `<p class="muted">${escapeHtml(t("ui.noCraftedItems"))}</p>`
        }
      </div>
    </section>
  `;
}

function renderForgeIngredient(ingredient: RecipeDefinition["ingredients"][number]): string {
  const material = definitions.materials.find(
    (candidate) => candidate.id === ingredient.materialId,
  );
  if (!material) {
    return "";
  }
  const stock = developmentInventory.stock[material.id] ?? 0;
  const hasEnough = stock >= ingredient.quantity;

  return `
    <article class="forge-ingredient ${rarityClass(material.rarity as Rarity)} ${
      hasEnough ? "" : "missing"
    }">
      ${renderItemArtwork("material", material.id)}
      <div>
        <strong>${escapeHtml(t(material.nameKey))}</strong>
        <span>${escapeHtml(t(`ui.rarity.${material.rarity}`))}</span>
      </div>
      <div class="forge-stock-control">
        <button data-forge-stock-material="${escapeHtml(material.id)}" data-forge-stock-delta="-1">
          -
        </button>
        <span>${stock}/${ingredient.quantity}</span>
        <button data-forge-stock-material="${escapeHtml(material.id)}" data-forge-stock-delta="1">
          +
        </button>
      </div>
    </article>
  `;
}

function renderCraftedItem(crafted: CraftedItemInstance): string {
  const output = itemDefinition(crafted.type, crafted.item.definitionId);

  return `
    <li class="crafted-item ${rarityClass(output.rarity as Rarity)}">
      ${output.element ? renderElementBadge(output.element as ElementType) : ""}
      ${renderItemArtwork(crafted.type, output.id)}
      <div>
        <strong>${escapeHtml(t(output.nameKey))}</strong>
        <span>${escapeHtml(crafted.item.id)}</span>
      </div>
    </li>
  `;
}

function renderDevelopmentInventoryPanel(): string {
  const craftedItems = filteredDevelopmentInventoryItems();
  const materialCount = definitions.materials.reduce(
    (sum, material) => sum + (developmentInventory.stock[material.id] ?? 0),
    0,
  );
  const craftedCountByType = countCraftedItemsByType();

  return `
    <section class="panel development-inventory">
      <div class="inventory-heading">
        <h2>${escapeHtml(t("ui.developmentInventory"))}</h2>
        <dl class="inventory-summary">
          ${stat(t("ui.credits"), String(developmentInventory.credits))}
          ${stat(t("ui.materials"), String(materialCount))}
          ${stat(t("ui.rings"), String(craftedCountByType.ring))}
          ${stat(t("ui.gems"), String(craftedCountByType.gem))}
          ${stat(t("ui.monsters"), String(craftedCountByType.monster))}
          ${stat(t("ui.spells"), String(craftedCountByType.spell))}
        </dl>
      </div>
      <div class="inventory-filters">
        <label>
          <span>${escapeHtml(t("ui.type"))}</span>
          <select id="inventoryTypeFilter">
            ${renderFilterOption("all", t("ui.all"), inventoryTypeFilter)}
            ${(["ring", "gem", "monster", "spell"] as const)
              .map((type) => renderFilterOption(type, t(`ui.${type}`), inventoryTypeFilter))
              .join("")}
          </select>
        </label>
        <label>
          <span>${escapeHtml(t("ui.rarity"))}</span>
          <select id="inventoryRarityFilter">
            ${renderFilterOption("all", t("ui.all"), inventoryRarityFilter)}
            ${(["common", "refined", "rare", "epic"] as const)
              .map((rarity) =>
                renderFilterOption(rarity, t(`ui.rarity.${rarity}`), inventoryRarityFilter),
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>${escapeHtml(t("ui.element"))}</span>
          <select id="inventoryElementFilter">
            ${renderFilterOption("all", t("ui.all"), inventoryElementFilter)}
            ${elementTypes
              .map((element) =>
                renderFilterOption(element, t(`ui.element.${element}`), inventoryElementFilter),
              )
              .join("")}
          </select>
        </label>
      </div>
      ${
        inventoryFeedback
          ? `<p class="lab-feedback ${inventoryFeedback.type}">${escapeHtml(
              inventoryFeedback.message,
            )}</p>`
          : ""
      }
      ${renderDevelopmentLoadoutBuilder()}
      <div class="inventory-section">
        <h3>${escapeHtml(t("ui.craftedItems"))}</h3>
        ${
          craftedItems.length > 0
            ? `<div class="inventory-item-grid">${craftedItems.map(renderInventoryCraftedCard).join("")}</div>`
            : `<p class="muted">${escapeHtml(t("ui.noCraftedItems"))}</p>`
        }
      </div>
      <div class="inventory-section">
        <h3>${escapeHtml(t("ui.materialStock"))}</h3>
        <div class="material-stock-grid">
          ${definitions.materials.map(renderMaterialStockCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderDevelopmentLoadoutBuilder(): string {
  const rings = craftedItemsOfType("ring");
  const selectedRings = selectedLoadoutRings();
  const savedLoadouts = listDevelopmentLoadouts();
  const summary = developmentLoadoutSummary(selectedRings);
  const canAddMore = selectedLoadoutRingIds.length < 10;

  return `
    <section class="inventory-section loadout-builder">
      <div class="loadout-heading">
        <h3>${escapeHtml(t("ui.loadoutBuilder"))}</h3>
        <dl class="inventory-summary">
          ${stat(t("ui.selectedRings"), `${selectedRings.length}/10`)}
          ${stat(t("ui.speed"), String(summary.speed))}
          ${stat(t("ui.totalDamage"), String(summary.totalDamage))}
          ${stat(t("ui.totalEnergyCost"), String(summary.totalEnergy))}
          ${stat(t("ui.damagePerEnergy"), summary.damagePerEnergy.toFixed(2))}
          ${stat(t("ui.damagePerCooldown"), summary.damagePerCooldown.toFixed(2))}
        </dl>
      </div>
      <div class="loadout-controls">
        <label>
          <span>${escapeHtml(t("ui.loadoutName"))}</span>
          <input id="developmentLoadoutName" value="${escapeHtml(developmentLoadoutName)}" />
        </label>
        <button id="saveDevelopmentLoadout" ${selectedRings.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.saveLoadout"))}
        </button>
        <label>
          <span>${escapeHtml(t("ui.savedLoadouts"))}</span>
          <select id="developmentLoadoutSelect" ${savedLoadouts.length === 0 ? "disabled" : ""}>
            ${
              savedLoadouts.length > 0
                ? savedLoadouts.map(renderDevelopmentLoadoutOption).join("")
                : `<option value="">${escapeHtml(t("ui.noSavedLoadouts"))}</option>`
            }
          </select>
        </label>
        <button id="loadDevelopmentLoadout" ${savedLoadouts.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.loadLoadout"))}
        </button>
        <button id="deleteDevelopmentLoadout" ${savedLoadouts.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.deletePreset"))}
        </button>
      </div>
      ${
        loadoutFeedback
          ? `<p class="lab-feedback ${loadoutFeedback.type}">${escapeHtml(
              loadoutFeedback.message,
            )}</p>`
          : ""
      }
      ${
        rings.length > 0
          ? `
            <div class="loadout-ring-list">
              ${rings.map((ring) => renderLoadoutRingOption(ring, canAddMore)).join("")}
            </div>
          `
          : `<p class="muted">${escapeHtml(t("ui.noCraftedRings"))}</p>`
      }
      <div class="loadout-details">
        ${
          selectedRings.length > 0
            ? selectedRings.map(renderLoadoutSelectedRing).join("")
            : `<p class="muted">${escapeHtml(t("ui.noLoadoutRingsSelected"))}</p>`
        }
      </div>
      <div class="loadout-actions">
        <button id="sendLoadoutToPlayerOne" ${selectedRings.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.sendToPlayerOne"))}
        </button>
        <button id="sendLoadoutToPlayerTwo" ${selectedRings.length === 0 ? "disabled" : ""}>
          ${escapeHtml(t("ui.sendToPlayerTwo"))}
        </button>
      </div>
    </section>
  `;
}

function renderDevelopmentLoadoutOption(loadout: DevelopmentLoadout): string {
  return `
    <option value="${escapeHtml(loadout.id)}">
      ${escapeHtml(loadout.name)} (${loadout.ringInstanceIds.length})
    </option>
  `;
}

function renderLoadoutRingOption(
  crafted: Extract<CraftedItemInstance, { type: "ring" }>,
  canAddMore: boolean,
): string {
  const definition = itemDefinition("ring", crafted.item.definitionId);
  const selected = selectedLoadoutRingIds.includes(crafted.item.id);
  const xp = itemXpProgress(crafted);
  const socketLabel =
    crafted.item.socketedGemInstanceIds.length > 0
      ? crafted.item.socketedGemInstanceIds
          .map((gemId) => {
            const gem = craftedItemById("gem", gemId);
            return gem ? t(itemDefinition("gem", gem.item.definitionId).nameKey) : gemId;
          })
          .join(t("ui.listSeparator"))
      : t("ui.noGem");

  return `
    <label class="loadout-ring-option ${rarityClass(definition.rarity as Rarity)}">
      <input
        type="checkbox"
        data-loadout-ring-id="${escapeHtml(crafted.item.id)}"
        ${selected ? "checked" : ""}
        ${selected || canAddMore ? "" : "disabled"}
      />
      ${definition.element ? renderElementBadge(definition.element as ElementType) : ""}
      ${renderItemArtwork("ring", definition.id)}
      <span>
        <strong>${escapeHtml(t(definition.nameKey))}</strong>
        <small>${escapeHtml(t("ui.level"))}: ${xp.level} / ${escapeHtml(xpProgressLabel(xp))}</small>
        <small>${escapeHtml(t("ui.socketedGems"))}: ${escapeHtml(socketLabel)}</small>
        <code>${escapeHtml(crafted.item.id)}</code>
      </span>
    </label>
  `;
}

function renderLoadoutSelectedRing(
  crafted: Extract<CraftedItemInstance, { type: "ring" }>,
): string {
  const definition = itemDefinition("ring", crafted.item.definitionId);
  const resolved = resolvedLoadoutRing(crafted);
  const xp = itemXpProgress(crafted);
  const gemLabels = crafted.item.socketedGemInstanceIds
    .map((gemId) => {
      const gem = craftedItemById("gem", gemId);
      if (!gem) {
        return gemId;
      }
      const gemDefinition = itemDefinition("gem", gem.item.definitionId);
      return `${t(gemDefinition.nameKey)} (${gemInventoryEnchantmentLabel(gem)})`;
    })
    .join(t("ui.listSeparator"));

  return `
    <article class="loadout-selected-ring ${rarityClass(definition.rarity as Rarity)}">
      ${renderItemArtwork("ring", definition.id)}
      <div>
        <strong>${escapeHtml(t(definition.nameKey))}</strong>
        <span>${escapeHtml(t("ui.level"))}: ${xp.level}</span>
        <span>${escapeHtml(xpProgressLabel(xp))}</span>
        <span>${escapeHtml(t("ui.damage"))}: ${resolved ? renderResolvedValue(ringTotalDamage(resolved), baseRingTotalDamage(resolved)) : "-"}</span>
        <span>${escapeHtml(t("ui.energy"))}: ${resolved?.energyCost ?? "-"}</span>
        <span>${escapeHtml(t("ui.cooldown"))}: ${resolved?.cooldown ?? "-"}</span>
        <span>${escapeHtml(t("ui.speed"))}: ${resolved?.speed ?? "-"}</span>
        <span>${escapeHtml(t("ui.socketedGems"))}: ${escapeHtml(gemLabels || t("ui.noGem"))}</span>
      </div>
    </article>
  `;
}

function renderFilterOption(value: string, label: string, selectedValue: string): string {
  return `
    <option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>
      ${escapeHtml(label)}
    </option>
  `;
}

function renderInventoryCraftedCard(crafted: CraftedItemInstance): string {
  const output = itemDefinition(crafted.type, crafted.item.definitionId);
  const xp = itemXpProgress(crafted);
  const extraStats =
    crafted.type === "ring"
      ? `${t("ui.sockets")}: ${crafted.item.socketCount}`
      : crafted.type === "gem"
        ? `${t("ui.enchantment")}: ${gemInventoryEnchantmentLabel(crafted)}`
        : `${t("ui.sourceInstance")}: ${crafted.item.id}`;

  return `
    <article
      class="inventory-card ${rarityClass(output.rarity as Rarity)}"
      data-inventory-kind="${escapeHtml(crafted.type)}"
      data-inventory-id="${escapeHtml(crafted.item.id)}"
    >
      ${output.element ? renderElementBadge(output.element as ElementType) : ""}
      ${renderItemArtwork(crafted.type, output.id)}
      <strong>${escapeHtml(t(output.nameKey))}</strong>
      <span>${escapeHtml(t(`ui.${crafted.type}`))} - ${escapeHtml(t(`ui.rarity.${output.rarity}`))}</span>
      <span>${escapeHtml(t("ui.level"))}: ${xp.level}</span>
      <span>${escapeHtml(t("ui.quality"))}: ${crafted.item.quality}</span>
      ${renderXpProgress(xp)}
      ${renderInventoryCraftedCombatStats(crafted)}
      <span>${escapeHtml(extraStats)}</span>
      ${renderItemImprovementControls(crafted)}
      ${crafted.type === "ring" ? renderRingSocketControls(crafted) : ""}
      ${crafted.type === "gem" ? renderGemEnchantmentControls(crafted) : ""}
      <code>${escapeHtml(crafted.item.id)}</code>
    </article>
  `;
}

function renderInventoryCraftedCombatStats(crafted: CraftedItemInstance): string {
  const level = Math.max(1, levelFromExperience(crafted.item.experience));
  const quality = crafted.item.quality;

  if (crafted.type === "ring") {
    const baseDamage = baseRingDamage(crafted.item.definitionId);
    return `<span>${escapeHtml(t("ui.damage"))}: ${renderResolvedValue(resolveItemStat(baseDamage, level, quality), baseDamage)}</span>`;
  }

  if (crafted.type === "gem") {
    const baseDamage = baseGemDamage(crafted.item.definitionId);
    return `<span>${escapeHtml(t("ui.damage"))}: ${renderResolvedValue(resolveItemStat(baseDamage, level, quality), baseDamage)}</span>`;
  }

  if (crafted.type === "monster") {
    const baseHealth = baseMonsterHealth(crafted.item.definitionId);
    const baseDamage = baseMonsterDamage(crafted.item.definitionId);
    return `
      <span>${escapeHtml(t("ui.health"))}: ${renderResolvedValue(resolveItemStat(baseHealth, level, quality), baseHealth)}</span>
      <span>${escapeHtml(t("ui.damage"))}: ${renderResolvedValue(resolveItemStat(baseDamage, level, quality), baseDamage)}</span>
    `;
  }

  const baseDamage = baseSpellDamage(crafted.item.definitionId);
  return `<span>${escapeHtml(t("ui.damage"))}: ${renderResolvedValue(resolveItemStat(baseDamage, level, quality), baseDamage)}</span>`;
}

type ItemXpProgress = {
  level: number;
  currentXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
};

function itemXpProgress(crafted: CraftedItemInstance): ItemXpProgress {
  const level = Math.max(1, levelFromExperience(crafted.item.experience));
  const nextLevelXp = level >= MAX_LEVEL ? null : experienceForLevel(level + 1);
  const levelStartXp = experienceForLevel(level);
  const progressPercent =
    nextLevelXp === null
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.floor(
              ((crafted.item.experience - levelStartXp) / (nextLevelXp - levelStartXp)) * 100,
            ),
          ),
        );

  return {
    level,
    currentXp: crafted.item.experience,
    nextLevelXp,
    progressPercent,
  };
}

function xpProgressLabel(progress: ItemXpProgress): string {
  return progress.nextLevelXp === null
    ? formatMessage("ui.xpMaxLevel", { xp: String(progress.currentXp) })
    : formatMessage("ui.xpProgress", {
        current: String(progress.currentXp),
        next: String(progress.nextLevelXp),
      });
}

function renderXpProgress(progress: ItemXpProgress): string {
  return `
    <div class="xp-progress" title="${escapeHtml(xpProgressLabel(progress))}">
      <span>${escapeHtml(xpProgressLabel(progress))}</span>
      <div aria-hidden="true">
        <i style="width: ${progress.progressPercent}%"></i>
      </div>
    </div>
  `;
}

function renderItemImprovementControls(crafted: CraftedItemInstance): string {
  const definition = itemDefinition(crafted.type, crafted.item.definitionId);
  const rarity = definition.rarity as ImprovementRarity;
  const canImproveQuality = crafted.item.quality < 100;
  const qualityCost = canImproveQuality
    ? qualityImprovementCost(rarity, crafted.item.quality)
    : undefined;
  const canPayQuality = qualityCost !== undefined && developmentInventory.credits >= qualityCost;

  return `
    <div class="inventory-control improvement-control">
      <strong>${escapeHtml(t("ui.improvement"))}</strong>
      <span>
        ${escapeHtml(
          canImproveQuality
            ? formatMessage("ui.nextQuality", {
                quality: String(Math.min(100, crafted.item.quality + 5)),
              })
            : t("ui.maxQualityReached"),
        )}
      </span>
      <button
        data-improve-quality-type="${escapeHtml(crafted.type)}"
        data-improve-quality-id="${escapeHtml(crafted.item.id)}"
        ${canPayQuality ? "" : "disabled"}
      >
        ${escapeHtml(
          qualityCost === undefined
            ? t("ui.improveQuality")
            : formatMessage("ui.improveQualityCost", { cost: String(qualityCost) }),
        )}
      </button>
      ${crafted.type === "ring" ? renderSocketImprovementControl(crafted) : ""}
    </div>
  `;
}

function renderSocketImprovementControl(
  crafted: Extract<CraftedItemInstance, { type: "ring" }>,
): string {
  const definition = itemDefinition("ring", crafted.item.definitionId);
  const rarity = definition.rarity as ImprovementRarity;
  const canImproveSockets = crafted.item.socketCount < 3;
  const socketCost = canImproveSockets
    ? socketImprovementCost(rarity, crafted.item.socketCount)
    : undefined;
  const canPaySockets = socketCost !== undefined && developmentInventory.credits >= socketCost;

  return `
    <span>
      ${escapeHtml(
        canImproveSockets
          ? formatMessage("ui.nextSocketCount", {
              sockets: String(crafted.item.socketCount + 1),
            })
          : t("ui.maxSocketsReached"),
      )}
    </span>
    <button
      data-improve-sockets-ring-id="${escapeHtml(crafted.item.id)}"
      ${canPaySockets ? "" : "disabled"}
    >
      ${escapeHtml(
        socketCost === undefined
          ? t("ui.improveSockets")
          : formatMessage("ui.improveSocketsCost", { cost: String(socketCost) }),
      )}
    </button>
  `;
}

function renderRingSocketControls(crafted: Extract<CraftedItemInstance, { type: "ring" }>): string {
  const socketedGems = crafted.item.socketedGemInstanceIds
    .map((gemId) => craftedItemById("gem", gemId))
    .filter((gem): gem is Extract<CraftedItemInstance, { type: "gem" }> => Boolean(gem));
  const availableGems = unsocketedGems();
  const canAddGem = crafted.item.socketedGemInstanceIds.length < crafted.item.socketCount;

  return `
    <div class="inventory-control">
      <strong>${escapeHtml(t("ui.socketedGems"))}</strong>
      ${
        socketedGems.length > 0
          ? socketedGems
              .map((gem) => {
                const definition = itemDefinition("gem", gem.item.definitionId);
                return `
                  <span>
                    ${escapeHtml(t(definition.nameKey))}
                    <button
                      data-unsocket-gem-ring-id="${escapeHtml(crafted.item.id)}"
                      data-unsocket-gem-id="${escapeHtml(gem.item.id)}"
                      title="${escapeHtml(t("ui.unsocketGem"))}"
                    >
                      -
                    </button>
                  </span>
                `;
              })
              .join("")
          : `<span>${escapeHtml(t("ui.noGem"))}</span>`
      }
      <div class="inventory-control-row">
        <select
          data-socket-gem-select="${escapeHtml(crafted.item.id)}"
          ${canAddGem && availableGems.length > 0 ? "" : "disabled"}
        >
          ${
            availableGems.length > 0
              ? availableGems
                  .map((gem) => {
                    const definition = itemDefinition("gem", gem.item.definitionId);
                    return `
                      <option value="${escapeHtml(gem.item.id)}">
                        ${escapeHtml(t(definition.nameKey))}
                      </option>
                    `;
                  })
                  .join("")
              : `<option value="">${escapeHtml(t("ui.noAvailableGems"))}</option>`
          }
        </select>
        <button
          data-socket-gem-ring-id="${escapeHtml(crafted.item.id)}"
          ${canAddGem && availableGems.length > 0 ? "" : "disabled"}
        >
          ${escapeHtml(t("ui.socketGem"))}
        </button>
      </div>
    </div>
  `;
}

function renderGemEnchantmentControls(
  crafted: Extract<CraftedItemInstance, { type: "gem" }>,
): string {
  const availableEnchantments = unusedEnchantments();
  const enchantment = crafted.item.enchantment;

  return `
    <div class="inventory-control">
      <strong>${escapeHtml(t("ui.enchantment"))}</strong>
      ${
        enchantment
          ? `
            <span>
              ${escapeHtml(gemInventoryEnchantmentLabel(crafted))}
              <button
                data-remove-gem-enchantment="${escapeHtml(crafted.item.id)}"
                title="${escapeHtml(t("ui.removeEnchantment"))}"
              >
                -
              </button>
            </span>
          `
          : `
            <div class="inventory-control-row">
              <select
                data-enchant-gem-select="${escapeHtml(crafted.item.id)}"
                ${availableEnchantments.length > 0 ? "" : "disabled"}
              >
                ${
                  availableEnchantments.length > 0
                    ? availableEnchantments
                        .map((item) => {
                          const definition = itemDefinition(item.type, item.item.definitionId);
                          return `
                            <option value="${escapeHtml(`${item.type}:${item.item.id}`)}">
                              ${escapeHtml(t(`ui.${item.type}`))}: ${escapeHtml(t(definition.nameKey))}
                            </option>
                          `;
                        })
                        .join("")
                    : `<option value="">${escapeHtml(t("ui.noAvailableEnchantments"))}</option>`
                }
              </select>
              <button
                data-enchant-gem-id="${escapeHtml(crafted.item.id)}"
                ${availableEnchantments.length > 0 ? "" : "disabled"}
              >
                ${escapeHtml(t("ui.enchantGem"))}
              </button>
            </div>
          `
      }
    </div>
  `;
}

function renderMaterialStockCard(material: (typeof definitions.materials)[number]): string {
  const stock = developmentInventory.stock[material.id] ?? 0;

  return `
    <article
      class="inventory-card material-stock-card ${rarityClass(material.rarity as Rarity)}"
      data-inventory-material-id="${escapeHtml(material.id)}"
    >
      ${renderItemArtwork("material", material.id)}
      <strong>${escapeHtml(t(material.nameKey))}</strong>
      <span>${escapeHtml(t(`ui.rarity.${material.rarity}`))}</span>
      <span>${escapeHtml(t("ui.quantity"))}: ${stock}</span>
      <code>${escapeHtml(material.id)}</code>
    </article>
  `;
}

function battleRewardPreview(result: BattleResult): BattleRewardPreview {
  if (result.type === "draw") {
    return {
      credits: 90,
      materials: [
        { materialId: "aluminium", quantity: 1 },
        { materialId: "pearl", quantity: 1 },
      ],
      itemXp: battleItemXpRewards(),
      reasonKey: "ui.drawRewards",
    };
  }

  return {
    credits: 150,
    materials: [
      { materialId: "aluminium", quantity: 1 },
      { materialId: "hydrogen", quantity: 1 },
      { materialId: "pearl", quantity: 1 },
      { materialId: "sand", quantity: 1 },
    ],
    itemXp: battleItemXpRewards(),
    reasonKey: "ui.winnerRewards",
  };
}

function claimBattleRewards(): void {
  if (battleRewardsClaimed || state.status !== "finished" || !state.result || isReplayLocked()) {
    return;
  }

  const rewards = battleRewardPreview(state.result);
  developmentInventory = {
    ...developmentInventory,
    credits: developmentInventory.credits + rewards.credits,
    stock: {
      ...developmentInventory.stock,
      ...Object.fromEntries(
        rewards.materials.map((reward) => [
          reward.materialId,
          (developmentInventory.stock[reward.materialId] ?? 0) + reward.quantity,
        ]),
      ),
    },
    craftedItems: applyItemXpRewards(developmentInventory.craftedItems, rewards.itemXp),
  };
  battleRewardsClaimed = true;
  persistDevelopmentInventory();
}

function battleItemXpRewards(): BattleRewardItemXp[] {
  const sourceMap = battleSourceMap();
  const rewards = new Map<string, BattleRewardItemXp>();
  const summonedMonsters = new Map<string, string>();
  let activeRingId: string | null = null;
  let pendingMonsterEnchantments: Array<{ definitionId: string; sourceInstanceId: string }> = [];

  const addXp = (
    type: CraftedItemInstance["type"],
    sourceInstanceId: string | undefined,
    xp: number,
  ) => {
    if (!sourceInstanceId || !craftedItemById(type, sourceInstanceId)) {
      return;
    }
    const existing = rewards.get(sourceInstanceId);
    rewards.set(sourceInstanceId, {
      sourceInstanceId,
      type,
      xp: (existing?.xp ?? 0) + xp,
    });
  };

  for (const sourceInstanceId of sourceMap.rings.values()) {
    addXp("ring", sourceInstanceId, EQUIPPED_ITEM_XP_REWARD);
  }
  for (const sourceInstanceId of sourceMap.gems.values()) {
    addXp("gem", sourceInstanceId, EQUIPPED_ITEM_XP_REWARD);
  }
  for (const enchantment of sourceMap.enchantments.values()) {
    addXp(enchantment.type, enchantment.sourceInstanceId, EQUIPPED_ITEM_XP_REWARD);
  }

  for (const event of state.log) {
    if (event.type === "ringUsed") {
      activeRingId = event.ringInstanceId;
      pendingMonsterEnchantments = [...(sourceMap.ringMonsterEnchantments.get(activeRingId) ?? [])];
      addXp("ring", sourceMap.rings.get(event.ringInstanceId), USED_ITEM_XP_REWARD);
      for (const gemId of sourceMap.ringGemIds.get(event.ringInstanceId) ?? []) {
        addXp("gem", sourceMap.gems.get(gemId), USED_ITEM_XP_REWARD);
      }
      continue;
    }

    if (event.type === "spellCast") {
      const enchantment = sourceMap.enchantments.get(event.sourceGemId);
      if (enchantment?.type === "spell") {
        addXp("spell", enchantment.sourceInstanceId, USED_ITEM_XP_REWARD);
      }
      continue;
    }

    if (event.type === "monsterSummoned") {
      const sourceIndex = pendingMonsterEnchantments.findIndex(
        (enchantment) => enchantment.definitionId === event.monsterId,
      );
      const source = pendingMonsterEnchantments[sourceIndex];
      if (source) {
        pendingMonsterEnchantments.splice(sourceIndex, 1);
        summonedMonsters.set(event.monsterInstanceId, source.sourceInstanceId);
        addXp("monster", source.sourceInstanceId, USED_ITEM_XP_REWARD);
      }
      continue;
    }

    if (event.type === "monsterUsed") {
      addXp("monster", summonedMonsters.get(event.monsterInstanceId), USED_ITEM_XP_REWARD);
    }
  }

  return Array.from(rewards.values()).sort((first, second) =>
    first.sourceInstanceId.localeCompare(second.sourceInstanceId),
  );
}

function applyItemXpRewards(
  craftedItems: readonly CraftedItemInstance[],
  rewards: readonly BattleRewardItemXp[],
): CraftedItemInstance[] {
  const xpById = new Map(rewards.map((reward) => [reward.sourceInstanceId, reward.xp]));
  return craftedItems.map((crafted) => {
    const xp = xpById.get(crafted.item.id) ?? 0;
    if (xp === 0) {
      return crafted;
    }
    return {
      ...crafted,
      item: {
        ...crafted.item,
        experience: crafted.item.experience + xp,
      },
    } as CraftedItemInstance;
  });
}

function battleResultSummary(): BattleResultSummary | null {
  if (state.status !== "finished" || !state.result) {
    return null;
  }

  const damageByPlayerId = new Map(state.players.map((player) => [player.id, 0]));
  const ringsUsed = new Map<string, { id: string; label: string; count: number }>();
  const spellsCast = new Map<string, { id: string; label: string; count: number }>();
  const monstersSummoned = new Map<string, { id: string; label: string; count: number }>();
  const monstersUsed = new Map<string, { id: string; label: string; count: number }>();
  const monsterDefinitionByInstanceId = new Map<string, string>();
  let turnCount = 0;
  let activeDamageOwnerId: string | undefined;

  for (const player of state.players) {
    for (const monster of player.monsters) {
      monsterDefinitionByInstanceId.set(monster.id, monster.definitionId);
    }
  }

  for (const event of state.log) {
    switch (event.type) {
      case "turnStarted":
        turnCount = Math.max(turnCount, event.turnCount);
        break;
      case "ringUsed":
        activeDamageOwnerId = event.playerId;
        incrementSummaryEntry(ringsUsed, event.ringInstanceId, ringLabel(event.ringInstanceId));
        break;
      case "spellCast":
        incrementSummaryEntry(spellsCast, event.spellId, spellLabel(event.spellId));
        break;
      case "monsterSummoned":
        monsterDefinitionByInstanceId.set(event.monsterInstanceId, event.monsterId);
        incrementSummaryEntry(
          monstersSummoned,
          event.monsterId,
          monsterDefinitionLabel(event.monsterId),
        );
        break;
      case "monsterUsed": {
        activeDamageOwnerId = event.playerId;
        const monsterDefinitionId = monsterDefinitionByInstanceId.get(event.monsterInstanceId);
        const label = monsterDefinitionId
          ? monsterDefinitionLabel(monsterDefinitionId)
          : combatObjectLabel(event.monsterInstanceId);
        incrementSummaryEntry(monstersUsed, label, label);
        break;
      }
      case "damageDealt": {
        const ownerId = sourceOwnerId(event.sourceId) ?? activeDamageOwnerId;
        if (ownerId) {
          damageByPlayerId.set(ownerId, (damageByPlayerId.get(ownerId) ?? 0) + event.amount);
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    resultLabel: battleResultMessage(state.result),
    turnCount,
    actionCount: state.actionHistory.length,
    damageByPlayer: state.players.map((player) => ({
      playerId: player.id,
      playerName: player.username,
      damage: damageByPlayerId.get(player.id) ?? 0,
    })),
    ringsUsed: Array.from(ringsUsed.values()),
    spellsCast: Array.from(spellsCast.values()),
    monstersSummoned: Array.from(monstersSummoned.values()),
    monstersUsed: Array.from(monstersUsed.values()),
    itemXp: battleItemXpRewards(),
    rewardsStatusKey: isReplayLocked()
      ? "ui.rewardsUnavailableInReplay"
      : battleRewardsClaimed
        ? "ui.rewardsClaimed"
        : "ui.rewardsUnclaimed",
  };
}

function incrementSummaryEntry(
  entries: Map<string, { id: string; label: string; count: number }>,
  id: string,
  label: string,
): void {
  const existing = entries.get(id);
  entries.set(id, {
    id,
    label,
    count: (existing?.count ?? 0) + 1,
  });
}

function sourceOwnerId(sourceId: string): string | undefined {
  for (const player of state.players) {
    for (const ring of player.rings) {
      if (ring.id === sourceId) {
        return player.id;
      }

      if (
        ring.gems.some(
          (gem) => gem.enchantment?.type === "spell" && gem.enchantment.spellId === sourceId,
        )
      ) {
        return player.id;
      }
    }

    if (player.monsters.some((monster) => monster.id === sourceId)) {
      return player.id;
    }
  }

  return state.players.find((player) => sourceId.startsWith(`${player.id}.`))?.id;
}

function battleSourceMap(): BattleSourceMap {
  const result: BattleSourceMap = {
    rings: new Map(),
    gems: new Map(),
    ringGemIds: new Map(),
    enchantments: new Map(),
    ringMonsterEnchantments: new Map(),
  };

  if (setupMode !== "battleLab") {
    return result;
  }

  for (const player of battleLabConfig.players) {
    player.rings.forEach((ring, ringIndex) => {
      const ringId = `${player.id}.lab.ring.${ringIndex + 1}`;
      if (ring.sourceInstanceId) {
        result.rings.set(ringId, ring.sourceInstanceId);
      }

      const gemIds: string[] = [];
      const monsterEnchantments: Array<{ definitionId: string; sourceInstanceId: string }> = [];
      ring.gems.forEach((gem, gemIndex) => {
        const gemId = `${ringId}.gem.${gemIndex + 1}`;
        gemIds.push(gemId);
        if (gem.sourceInstanceId) {
          result.gems.set(gemId, gem.sourceInstanceId);
        }
        if (gem.enchantment?.sourceInstanceId) {
          result.enchantments.set(gemId, {
            type: gem.enchantment.type,
            sourceInstanceId: gem.enchantment.sourceInstanceId,
          });
          if (gem.enchantment.type === "monster") {
            monsterEnchantments.push({
              definitionId: gem.enchantment.definitionId,
              sourceInstanceId: gem.enchantment.sourceInstanceId,
            });
          }
        }
      });
      result.ringGemIds.set(ringId, gemIds);
      result.ringMonsterEnchantments.set(ringId, monsterEnchantments);
    });
  }

  return result;
}

function filteredDevelopmentInventoryItems(): CraftedItemInstance[] {
  return developmentInventory.craftedItems.filter((item) => {
    const definition = itemDefinition(item.type, item.item.definitionId);
    const typeMatches = inventoryTypeFilter === "all" || item.type === inventoryTypeFilter;
    const rarityMatches =
      inventoryRarityFilter === "all" || definition.rarity === inventoryRarityFilter;
    const elementMatches =
      inventoryElementFilter === "all" || definition.element === inventoryElementFilter;
    return typeMatches && rarityMatches && elementMatches;
  });
}

function countCraftedItemsByType(): Record<CraftedItemInstance["type"], number> {
  return {
    ring: craftedItemsOfType("ring").length,
    gem: craftedItemsOfType("gem").length,
    monster: craftedItemsOfType("monster").length,
    spell: craftedItemsOfType("spell").length,
  };
}

function selectedLoadoutRings(): Extract<CraftedItemInstance, { type: "ring" }>[] {
  return selectedLoadoutRingIds.flatMap((ringId) => {
    const ring = craftedItemById("ring", ringId);
    return ring ? [ring] : [];
  });
}

function developmentLoadoutSummary(rings: Extract<CraftedItemInstance, { type: "ring" }>[]): {
  speed: number;
  totalDamage: number;
  totalEnergy: number;
  totalCooldown: number;
  damagePerEnergy: number;
  damagePerCooldown: number;
} {
  if (rings.length === 0) {
    return {
      speed: 0,
      totalDamage: 0,
      totalEnergy: 0,
      totalCooldown: 0,
      damagePerEnergy: 0,
      damagePerCooldown: 0,
    };
  }

  const previewPlayer = createLoadoutPreviewPlayer(rings);
  const totalDamage = previewPlayer.rings.reduce((sum, ring) => sum + ringTotalDamage(ring), 0);
  const totalEnergy = previewPlayer.rings.reduce((sum, ring) => sum + ring.energyCost, 0);
  const totalCooldown = previewPlayer.rings.reduce((sum, ring) => sum + ring.cooldown, 0);

  return {
    speed: previewPlayer.hero.speed,
    totalDamage,
    totalEnergy,
    totalCooldown,
    damagePerEnergy: totalEnergy === 0 ? 0 : totalDamage / totalEnergy,
    damagePerCooldown: totalCooldown === 0 ? 0 : totalDamage / totalCooldown,
  };
}

function resolvedLoadoutRing(
  crafted: Extract<CraftedItemInstance, { type: "ring" }>,
): RingView | undefined {
  return createLoadoutPreviewPlayer([crafted]).rings[0];
}

function createLoadoutPreviewPlayer(
  rings: Extract<CraftedItemInstance, { type: "ring" }>[],
): BattlePlayerView {
  const setup = createBattleSetupFromLab({
    id: "developmentLoadoutPreview",
    seed: "development-loadout-preview",
    players: [
      {
        id: "developmentLoadoutPreviewPlayer",
        username: "Development Loadout",
        level: battleLabConfig.players[0].level,
        rings:
          rings.length > 0 ? rings.map(battleLabRingFromCraftedRing) : [createDefaultLabRing()],
      },
      {
        id: "developmentLoadoutPreviewOpponent",
        username: "Preview Opponent",
        level: 1,
        rings: [createDefaultLabRing()],
      },
    ],
  });
  return createBattleState(setup).players[0]!;
}

function socketedGemIds(): Set<string> {
  return new Set(craftedItemsOfType("ring").flatMap((ring) => ring.item.socketedGemInstanceIds));
}

function unsocketedGems(): Extract<CraftedItemInstance, { type: "gem" }>[] {
  const usedGemIds = socketedGemIds();
  return craftedItemsOfType("gem").filter((gem) => !usedGemIds.has(gem.item.id));
}

function usedEnchantmentIds(): Set<string> {
  const result = new Set<string>();
  for (const gem of craftedItemsOfType("gem")) {
    if (gem.item.enchantment?.type === "monster") {
      result.add(gem.item.enchantment.monsterInstanceId);
    }
    if (gem.item.enchantment?.type === "spell") {
      result.add(gem.item.enchantment.spellInstanceId);
    }
  }
  return result;
}

function unusedEnchantments(): Array<
  | Extract<CraftedItemInstance, { type: "monster" }>
  | Extract<CraftedItemInstance, { type: "spell" }>
> {
  const usedIds = usedEnchantmentIds();
  return [...craftedItemsOfType("spell"), ...craftedItemsOfType("monster")].filter(
    (item) => !usedIds.has(item.item.id),
  );
}

function gemInventoryEnchantmentLabel(
  crafted: Extract<CraftedItemInstance, { type: "gem" }>,
): string {
  const enchantment = crafted.item.enchantment;
  if (!enchantment) {
    return t("ui.none");
  }

  const enchantmentItem =
    enchantment.type === "monster"
      ? craftedItemById("monster", enchantment.monsterInstanceId)
      : craftedItemById("spell", enchantment.spellInstanceId);
  if (!enchantmentItem) {
    return enchantment.type === "monster"
      ? enchantment.monsterInstanceId
      : enchantment.spellInstanceId;
  }

  const definition = itemDefinition(enchantmentItem.type, enchantmentItem.item.definitionId);
  return `${t(`ui.${enchantmentItem.type}`)}: ${t(definition.nameKey)}`;
}

function socketGemIntoRing(ringId: string, gemId: string): void {
  const ring = craftedItemById("ring", ringId);
  const gem = craftedItemById("gem", gemId);
  if (!ring || !gem) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }
  if (ring.item.socketedGemInstanceIds.length >= ring.item.socketCount) {
    inventoryFeedback = { type: "error", message: t("ui.ringSocketsFull") };
    return;
  }
  if (socketedGemIds().has(gemId)) {
    inventoryFeedback = { type: "error", message: t("ui.gemAlreadySocketed") };
    return;
  }

  updateCraftedItem("ring", ringId, {
    ...ring.item,
    socketedGemInstanceIds: [...ring.item.socketedGemInstanceIds, gemId],
  });
  inventoryFeedback = { type: "success", message: t("ui.gemSocketed") };
}

function unsocketGemFromRing(ringId: string, gemId: string): void {
  const ring = craftedItemById("ring", ringId);
  if (!ring) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }

  updateCraftedItem("ring", ringId, {
    ...ring.item,
    socketedGemInstanceIds: ring.item.socketedGemInstanceIds.filter((id) => id !== gemId),
  });
  inventoryFeedback = { type: "success", message: t("ui.gemUnsocketed") };
}

function enchantGem(gemId: string, enchantmentValue: string): void {
  const [type, instanceId] = enchantmentValue.split(":");
  if ((type !== "monster" && type !== "spell") || !instanceId) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }

  const gem = craftedItemById("gem", gemId);
  const enchantmentItem = craftedItemById(type, instanceId);
  if (!gem || !enchantmentItem) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }
  if (gem.item.enchantment) {
    inventoryFeedback = { type: "error", message: t("ui.gemAlreadyEnchanted") };
    return;
  }
  if (usedEnchantmentIds().has(instanceId)) {
    inventoryFeedback = { type: "error", message: t("ui.enchantmentAlreadyUsed") };
    return;
  }

  updateCraftedItem("gem", gemId, {
    ...gem.item,
    enchantment:
      type === "monster"
        ? { type: "monster", monsterInstanceId: instanceId }
        : { type: "spell", spellInstanceId: instanceId },
  });
  inventoryFeedback = { type: "success", message: t("ui.gemEnchanted") };
}

function removeGemEnchantment(gemId: string): void {
  const gem = craftedItemById("gem", gemId);
  if (!gem) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }

  updateCraftedItem("gem", gemId, {
    ...gem.item,
    enchantment: undefined,
  });
  inventoryFeedback = { type: "success", message: t("ui.enchantmentRemoved") };
}

function improveInventoryItemQuality(type: CraftedItemInstance["type"], instanceId: string): void {
  const crafted = craftedItemById(type, instanceId);
  if (!crafted) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }

  try {
    const definition = itemDefinition(type, crafted.item.definitionId);
    const result = improveCraftedItemQuality(
      crafted,
      definition.rarity as ImprovementRarity,
      developmentInventory.credits,
    );
    replaceCraftedItem(result.crafted, result.credits);
    inventoryFeedback = {
      type: "success",
      message: formatMessage("ui.qualityImproved", {
        item: t(definition.nameKey),
        quality: String(result.crafted.item.quality),
      }),
    };
  } catch (error) {
    inventoryFeedback = {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function improveInventoryRingSockets(instanceId: string): void {
  const crafted = craftedItemById("ring", instanceId);
  if (!crafted) {
    inventoryFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }

  try {
    const definition = itemDefinition("ring", crafted.item.definitionId);
    const result = improveRingSocketCount(
      crafted,
      definition.rarity as ImprovementRarity,
      developmentInventory.credits,
    );
    replaceCraftedItem(result.crafted, result.credits);
    inventoryFeedback = {
      type: "success",
      message: formatMessage("ui.socketsImproved", {
        item: t(definition.nameKey),
        sockets: String(result.crafted.item.socketCount),
      }),
    };
  } catch (error) {
    inventoryFeedback = {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function setLoadoutRingSelection(ringId: string, selected: boolean): void {
  const existing = new Set(selectedLoadoutRingIds);
  if (selected) {
    existing.add(ringId);
  } else {
    existing.delete(ringId);
  }

  selectedLoadoutRingIds = Array.from(existing)
    .filter((candidateId) => craftedItemById("ring", candidateId))
    .slice(0, 10);
  loadoutFeedback = null;
}

function saveCurrentDevelopmentLoadout(): void {
  try {
    const name =
      document.querySelector<HTMLInputElement>("#developmentLoadoutName")?.value ??
      developmentLoadoutName;
    developmentLoadoutName = name;
    const ringIds = selectedLoadoutRings().map((ring) => ring.item.id);
    const loadout = saveDevelopmentLoadout(name, ringIds);
    loadoutFeedback = {
      type: "success",
      message: formatMessage("ui.developmentLoadoutSaved", { name: loadout.name }),
    };
  } catch (error) {
    loadoutFeedback = {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function loadSelectedDevelopmentLoadout(): void {
  const loadout = selectedDevelopmentLoadout();
  if (!loadout) {
    loadoutFeedback = { type: "error", message: t("ui.loadoutSelectionRequired") };
    return;
  }

  developmentLoadoutName = loadout.name;
  selectedLoadoutRingIds = loadout.ringInstanceIds.filter((ringId) =>
    Boolean(craftedItemById("ring", ringId)),
  );
  loadoutFeedback = {
    type: "success",
    message: formatMessage("ui.developmentLoadoutLoaded", { name: loadout.name }),
  };
}

function deleteSelectedDevelopmentLoadout(): void {
  const loadout = selectedDevelopmentLoadout();
  if (!loadout) {
    loadoutFeedback = { type: "error", message: t("ui.loadoutSelectionRequired") };
    return;
  }

  deleteDevelopmentLoadout(loadout.id);
  loadoutFeedback = {
    type: "success",
    message: formatMessage("ui.developmentLoadoutDeleted", { name: loadout.name }),
  };
}

function selectedDevelopmentLoadout(): DevelopmentLoadout | undefined {
  const id = document.querySelector<HTMLSelectElement>("#developmentLoadoutSelect")?.value ?? "";
  return listDevelopmentLoadouts().find((loadout) => loadout.id === id);
}

function applyDevelopmentLoadoutToBattleLabPlayer(playerIndex: number): void {
  const rings = selectedLoadoutRings();
  const player = battleLabConfig.players[playerIndex];
  if (!player) {
    loadoutFeedback = { type: "error", message: t("ui.inventoryItemMissing") };
    return;
  }
  if (rings.length === 0) {
    loadoutFeedback = { type: "error", message: t("ui.noLoadoutRingsSelected") };
    return;
  }

  setupMode = "battleLab";
  battleLabItemSourceMode = "inventory";
  player.rings.splice(0, player.rings.length, ...rings.map(battleLabRingFromCraftedRing));
  state = createState();
  battleLabFeedback = {
    type: "success",
    message: formatMessage("ui.developmentLoadoutApplied", { player: player.username }),
  };
  loadoutFeedback = {
    type: "success",
    message: formatMessage("ui.developmentLoadoutApplied", { player: player.username }),
  };
  openSetup();
}

function updateCraftedItem<T extends CraftedItemInstance["type"]>(
  type: T,
  instanceId: string,
  item: Extract<CraftedItemInstance, { type: T }>["item"],
): void {
  developmentInventory = {
    ...developmentInventory,
    craftedItems: developmentInventory.craftedItems.map((crafted) =>
      crafted.type === type && crafted.item.id === instanceId
        ? ({ type, item } as CraftedItemInstance)
        : crafted,
    ),
  };
  persistDevelopmentInventory();
}

function replaceCraftedItem(craftedItem: CraftedItemInstance, credits: number): void {
  developmentInventory = {
    ...developmentInventory,
    credits,
    craftedItems: developmentInventory.craftedItems.map((crafted) =>
      crafted.type === craftedItem.type && crafted.item.id === craftedItem.item.id
        ? craftedItem
        : crafted,
    ),
  };
  persistDevelopmentInventory();
}

function currentForgeRecipe(): RecipeDefinition {
  return (
    definitions.recipes.find((candidate) => candidate.id === selectedForgeRecipeId) ??
    definitions.recipes[0]!
  );
}

function forgeOutputDefinition(recipe: RecipeDefinition): ReturnType<typeof itemDefinition> {
  return itemDefinition(recipe.outputType, recipe.outputDefinitionId);
}

function forgeRecipeLabel(recipe: RecipeDefinition): string {
  const output = forgeOutputDefinition(recipe);
  return `${t(output.nameKey)} - ${t(`ui.${recipe.outputType}`)}`;
}

function itemDefinition(
  kind: Exclude<ItemAssetKind, "material">,
  definitionId: string,
): {
  id: string;
  nameKey: string;
  rarity: string;
  element?: string;
} {
  const groups = {
    ring: definitions.rings,
    gem: definitions.gems,
    monster: definitions.monsters,
    spell: definitions.spells,
  } as const;
  const definition = groups[kind].find((candidate) => candidate.id === definitionId);
  if (!definition) {
    throw new Error(`Missing ${kind} definition "${definitionId}".`);
  }
  return definition;
}

function materialDefinition(definitionId: string): (typeof definitions.materials)[number] {
  const definition = definitions.materials.find((candidate) => candidate.id === definitionId);
  if (!definition) {
    throw new Error(`Missing material definition "${definitionId}".`);
  }
  return definition;
}

function craftedItemsOfType<T extends CraftedItemInstance["type"]>(
  type: T,
): Extract<CraftedItemInstance, { type: T }>[] {
  return developmentInventory.craftedItems.filter(
    (item): item is Extract<CraftedItemInstance, { type: T }> => item.type === type,
  );
}

function craftedItemById<T extends CraftedItemInstance["type"]>(
  type: T,
  instanceId: string,
): Extract<CraftedItemInstance, { type: T }> | undefined {
  return craftedItemsOfType(type).find((item) => item.item.id === instanceId);
}

function battleLabRingFromCraftedRing(
  crafted: Extract<CraftedItemInstance, { type: "ring" }>,
): BattleLabRingConfig {
  return {
    sourceInstanceId: crafted.item.id,
    definitionId: crafted.item.definitionId,
    level: Math.max(1, levelFromExperience(crafted.item.experience)),
    quality: crafted.item.quality,
    socketCount: crafted.item.socketCount,
    gems: crafted.item.socketedGemInstanceIds.flatMap((gemId) => {
      const gem = craftedItemById("gem", gemId);
      return gem ? [battleLabGemFromCraftedGem(gem)] : [];
    }),
  };
}

function applyInventoryRingSource(ring: BattleLabRingConfig, instanceId: string): void {
  const crafted = craftedItemById("ring", instanceId);
  if (!crafted) {
    ring.sourceInstanceId = undefined;
    return;
  }

  Object.assign(ring, battleLabRingFromCraftedRing(crafted));
}

function applyInventoryGemSource(gem: BattleLabGemConfig, instanceId: string): void {
  const crafted = craftedItemById("gem", instanceId);
  if (!crafted) {
    gem.sourceInstanceId = undefined;
    return;
  }

  gem.sourceInstanceId = crafted.item.id;
  gem.definitionId = crafted.item.definitionId;
  gem.level = Math.max(1, levelFromExperience(crafted.item.experience));
  gem.quality = crafted.item.quality;
  gem.enchantment = battleLabEnchantmentFromCraftedGem(crafted);
}

function applyInventoryEnchantmentSource(
  enchantment: BattleLabEnchantmentConfig,
  instanceId: string,
): void {
  const crafted = craftedItemById(enchantment.type, instanceId);
  if (!crafted) {
    enchantment.sourceInstanceId = undefined;
    return;
  }

  enchantment.sourceInstanceId = crafted.item.id;
  enchantment.definitionId = crafted.item.definitionId;
  enchantment.level = Math.max(1, levelFromExperience(crafted.item.experience));
  enchantment.quality = crafted.item.quality;
}

function battleLabGemFromCraftedGem(
  crafted: Extract<CraftedItemInstance, { type: "gem" }>,
): BattleLabGemConfig {
  return {
    sourceInstanceId: crafted.item.id,
    definitionId: crafted.item.definitionId,
    level: Math.max(1, levelFromExperience(crafted.item.experience)),
    quality: crafted.item.quality,
    enchantment: battleLabEnchantmentFromCraftedGem(crafted),
  };
}

function battleLabEnchantmentFromCraftedGem(
  crafted: Extract<CraftedItemInstance, { type: "gem" }>,
): BattleLabEnchantmentConfig | undefined {
  const enchantment = crafted.item.enchantment;
  if (!enchantment) {
    return undefined;
  }

  const enchantmentItem =
    enchantment.type === "monster"
      ? craftedItemById("monster", enchantment.monsterInstanceId)
      : craftedItemById("spell", enchantment.spellInstanceId);
  if (!enchantmentItem) {
    return undefined;
  }

  return {
    type: enchantmentItem.type,
    sourceInstanceId: enchantmentItem.item.id,
    definitionId: enchantmentItem.item.definitionId,
    level: Math.max(1, levelFromExperience(enchantmentItem.item.experience)),
    quality: enchantmentItem.item.quality,
  };
}

function craftSelectedRecipe(): void {
  try {
    const recipe = currentForgeRecipe();
    const result = craftRecipe({
      recipe,
      ownerId: "forgePlayer",
      stock: developmentInventory.stock,
      instanceSequence: developmentInventory.nextSequence,
    });
    developmentInventory = {
      ...developmentInventory,
      stock: result.stock,
      craftedItems: [result.crafted, ...developmentInventory.craftedItems],
      nextSequence: developmentInventory.nextSequence + 1,
    };
    persistDevelopmentInventory();
    forgeFeedback = {
      type: "success",
      message: formatMessage("ui.craftedItemCreated", {
        item: t(forgeOutputDefinition(recipe).nameKey),
      }),
    };
  } catch (error) {
    forgeFeedback = {
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function adjustForgeStock(materialId: string, delta: number): void {
  developmentInventory = {
    ...developmentInventory,
    stock: {
      ...developmentInventory.stock,
      [materialId]: Math.max(0, (developmentInventory.stock[materialId] ?? 0) + delta),
    },
  };
  persistDevelopmentInventory();
  forgeFeedback = null;
}

function persistDevelopmentInventory(): void {
  saveDevelopmentInventory(developmentInventory);
}

function exportDevelopmentInventory(): void {
  forgeInventoryJsonText = serializeDevelopmentInventory(developmentInventory);
  forgeFeedback = { type: "success", message: t("ui.inventoryExported") };
}

function importDevelopmentInventory(): void {
  const text =
    document.querySelector<HTMLTextAreaElement>("#forgeInventoryJson")?.value ??
    forgeInventoryJsonText;
  forgeInventoryJsonText = text;

  try {
    developmentInventory = parseDevelopmentInventoryJson(text, definitions.materials);
    selectedLoadoutRingIds = selectedLoadoutRingIds.filter((ringId) =>
      Boolean(craftedItemById("ring", ringId)),
    );
    persistDevelopmentInventory();
    forgeInventoryJsonText = serializeDevelopmentInventory(developmentInventory);
    loadoutFeedback = null;
    forgeFeedback = { type: "success", message: t("ui.inventoryImported") };
  } catch (error) {
    forgeFeedback = {
      type: "error",
      message: formatMessage("ui.inventoryImportFailed", {
        reason: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

function resetDevelopmentInventory(): void {
  developmentInventory = createDefaultDevelopmentInventory(definitions.materials);
  selectedLoadoutRingIds = [];
  loadoutFeedback = null;
  persistDevelopmentInventory();
  forgeInventoryJsonText = "";
  forgeFeedback = { type: "success", message: t("ui.inventoryReset") };
}

function simulationResultLabel(result: BattleLabSimulationResult): string {
  if (result.timedOut) {
    return t("ui.simulationTimeout");
  }
  if (result.result?.type === "draw") {
    return t("ui.draw");
  }
  if (result.result?.type === "winner") {
    return formatMessage("ui.simulationWinner", {
      player: playerName(result.result.winnerId),
    });
  }
  return t("ui.none");
}

function playerName(playerId: string): string {
  return battleLabConfig.players.find((player) => player.id === playerId)?.username ?? playerId;
}

function balanceWarnings(
  summaries: readonly {
    player: BattleState["players"][number];
    damagePerEnergy: number;
    damagePerCooldown: number;
  }[],
): string[] {
  const warnings: string[] = [];
  const [left, right] = summaries;
  if (!left || !right) {
    return warnings;
  }

  const addRatioWarning = (metricKey: string, leftValue: number, rightValue: number): void => {
    const lower = Math.min(leftValue, rightValue);
    const higher = Math.max(leftValue, rightValue);
    if (lower > 0 && higher / lower >= 1.5) {
      const player = leftValue > rightValue ? left.player : right.player;
      warnings.push(
        formatMessage("ui.balanceEfficiencyWarning", {
          player: player.username,
          metric: t(metricKey),
        }),
      );
    }
  };

  addRatioWarning("ui.damagePerEnergy", left.damagePerEnergy, right.damagePerEnergy);
  addRatioWarning("ui.damagePerCooldown", left.damagePerCooldown, right.damagePerCooldown);

  const speedDifference = Math.abs(left.player.hero.speed - right.player.hero.speed);
  if (speedDifference >= 4) {
    const faster = left.player.hero.speed > right.player.hero.speed ? left.player : right.player;
    warnings.push(
      formatMessage("ui.balanceSpeedWarning", {
        player: faster.username,
        difference: String(speedDifference),
      }),
    );
  }

  return warnings;
}

function renderBattleLabPlayer(
  player: BattleLabConfig["players"][number],
  playerIndex: number,
): string {
  return `
    <article class="lab-player">
      <div class="lab-player-header">
        <label>
          <span>${escapeHtml(t("ui.username"))}</span>
          <input
            data-lab-player-index="${playerIndex}"
            data-lab-player-field="username"
            value="${escapeHtml(player.username)}"
          />
        </label>
        ${renderLabNumberInput(
          t("ui.level"),
          player.level,
          1,
          50,
          `data-lab-player-index="${playerIndex}" data-lab-player-field="level"`,
        )}
      </div>
      <div class="lab-rings">
        ${player.rings
          .map((ring, ringIndex) => renderBattleLabRing(ring, playerIndex, ringIndex))
          .join("")}
      </div>
      <button
        class="lab-add-button"
        data-lab-add-ring="${playerIndex}"
        ${player.rings.length >= 10 ? "disabled" : ""}
      >
        ${escapeHtml(t("ui.addRing"))}
      </button>
    </article>
  `;
}

function renderBattleLabRing(
  ring: BattleLabRingConfig,
  playerIndex: number,
  ringIndex: number,
): string {
  const socketLimit = ring.socketCount ?? 3;

  return `
    <article class="lab-ring">
      <div class="lab-item-heading">
        ${renderItemArtwork("ring", ring.definitionId)}
        ${
          battleLabItemSourceMode === "inventory"
            ? renderInventorySourceField(
                "ring",
                ring.sourceInstanceId,
                `data-lab-player-index="${playerIndex}" data-lab-ring-index="${ringIndex}" data-lab-ring-field="sourceInstanceId"`,
              )
            : `
              <label>
                <span>${escapeHtml(t("ui.ring"))}</span>
                <select
                  data-lab-player-index="${playerIndex}"
                  data-lab-ring-index="${ringIndex}"
                  data-lab-ring-field="definitionId"
                >
                  ${renderDefinitionOptions(definitions.rings, ring.definitionId)}
                </select>
              </label>
            `
        }
        <button
          class="lab-remove-button"
          data-lab-remove-ring="${playerIndex}:${ringIndex}"
          title="${escapeHtml(t("ui.removeRing"))}"
          ${battleLabConfig.players[playerIndex]!.rings.length <= 1 ? "disabled" : ""}
        >
          &times;
        </button>
      </div>
      <div class="lab-stat-fields">
        ${renderLabNumberInput(
          t("ui.level"),
          ring.level,
          1,
          50,
          `data-lab-player-index="${playerIndex}" data-lab-ring-index="${ringIndex}" data-lab-ring-field="level"`,
          battleLabItemSourceMode === "inventory",
        )}
        ${renderLabNumberInput(
          t("ui.quality"),
          ring.quality,
          0,
          100,
          `data-lab-player-index="${playerIndex}" data-lab-ring-index="${ringIndex}" data-lab-ring-field="quality"`,
          battleLabItemSourceMode === "inventory",
        )}
        ${stat(t("ui.sockets"), String(socketLimit))}
      </div>
      <div class="lab-gems">
        ${ring.gems
          .map((gem, gemIndex) => renderBattleLabGem(gem, playerIndex, ringIndex, gemIndex))
          .join("")}
      </div>
      <button
        class="lab-add-button"
        data-lab-add-gem="${playerIndex}:${ringIndex}"
        ${ring.gems.length >= socketLimit ? "disabled" : ""}
      >
        ${escapeHtml(t("ui.addGem"))}
      </button>
    </article>
  `;
}

function renderBattleLabGem(
  gem: BattleLabGemConfig,
  playerIndex: number,
  ringIndex: number,
  gemIndex: number,
): string {
  const pathAttributes = `data-lab-player-index="${playerIndex}" data-lab-ring-index="${ringIndex}" data-lab-gem-index="${gemIndex}"`;
  const enchantment = gem.enchantment;
  const enchantmentDefinitions =
    enchantment?.type === "monster" ? definitions.monsters : definitions.spells;

  return `
    <article class="lab-gem">
      <div class="lab-item-heading">
        ${renderItemArtwork("gem", gem.definitionId)}
        ${
          battleLabItemSourceMode === "inventory"
            ? renderInventorySourceField(
                "gem",
                gem.sourceInstanceId,
                `${pathAttributes} data-lab-gem-field="sourceInstanceId"`,
              )
            : `
              <label>
                <span>${escapeHtml(t("ui.gem"))}</span>
                <select ${pathAttributes} data-lab-gem-field="definitionId">
                  ${renderDefinitionOptions(definitions.gems, gem.definitionId)}
                </select>
              </label>
            `
        }
        <button
          class="lab-remove-button"
          data-lab-remove-gem="${playerIndex}:${ringIndex}:${gemIndex}"
          title="${escapeHtml(t("ui.removeGem"))}"
        >
          &times;
        </button>
      </div>
      <div class="lab-stat-fields">
        ${renderLabNumberInput(
          t("ui.level"),
          gem.level,
          1,
          50,
          `${pathAttributes} data-lab-gem-field="level"`,
          battleLabItemSourceMode === "inventory",
        )}
        ${renderLabNumberInput(
          t("ui.quality"),
          gem.quality,
          0,
          100,
          `${pathAttributes} data-lab-gem-field="quality"`,
          battleLabItemSourceMode === "inventory",
        )}
      </div>
      <div class="lab-enchantment">
        <label>
          <span>${escapeHtml(t("ui.enchantment"))}</span>
          <select ${pathAttributes} data-lab-enchantment-field="type">
            <option value="" ${enchantment ? "" : "selected"}>${escapeHtml(t("ui.none"))}</option>
            <option value="spell" ${enchantment?.type === "spell" ? "selected" : ""}>
              ${escapeHtml(t("ui.spell"))}
            </option>
            <option value="monster" ${enchantment?.type === "monster" ? "selected" : ""}>
              ${escapeHtml(t("ui.monster"))}
            </option>
          </select>
        </label>
        ${
          enchantment
            ? `
              <label>
                <span>${escapeHtml(t(`ui.${enchantment.type}`))}</span>
                ${
                  battleLabItemSourceMode === "inventory"
                    ? renderInventorySourceSelect(
                        enchantment.type,
                        enchantment.sourceInstanceId,
                        `${pathAttributes} data-lab-enchantment-field="sourceInstanceId"`,
                      )
                    : `
                      <select ${pathAttributes} data-lab-enchantment-field="definitionId">
                        ${renderDefinitionOptions(enchantmentDefinitions, enchantment.definitionId)}
                      </select>
                    `
                }
              </label>
              ${renderLabNumberInput(
                t("ui.level"),
                enchantment.level,
                1,
                50,
                `${pathAttributes} data-lab-enchantment-field="level"`,
                battleLabItemSourceMode === "inventory",
              )}
              ${renderLabNumberInput(
                t("ui.quality"),
                enchantment.quality,
                0,
                100,
                `${pathAttributes} data-lab-enchantment-field="quality"`,
                battleLabItemSourceMode === "inventory",
              )}
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderDefinitionOptions(
  items: readonly { id: string; nameKey: string }[],
  selectedId: string,
): string {
  return items
    .map(
      (item) => `
        <option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>
          ${escapeHtml(t(item.nameKey))}
        </option>
      `,
    )
    .join("");
}

function renderInventorySourceField(
  kind: CraftedItemInstance["type"],
  selectedInstanceId: string | undefined,
  attributes: string,
): string {
  return `
    <label>
      <span>${escapeHtml(t(`ui.${kind}`))}</span>
      ${renderInventorySourceSelect(kind, selectedInstanceId, attributes)}
    </label>
  `;
}

function renderInventorySourceSelect(
  kind: CraftedItemInstance["type"],
  selectedInstanceId: string | undefined,
  attributes: string,
): string {
  const instances = craftedItemsOfType(kind);

  if (instances.length === 0) {
    return `
      <select ${attributes} disabled>
        <option value="">${escapeHtml(t("ui.noInventoryItems"))}</option>
      </select>
    `;
  }

  return `
    <select ${attributes}>
      <option value="">${escapeHtml(t("ui.selectInventoryItem"))}</option>
      ${instances
        .map((instance) => {
          const definition = itemDefinition(kind, instance.item.definitionId);
          return `
            <option
              value="${escapeHtml(instance.item.id)}"
              ${instance.item.id === selectedInstanceId ? "selected" : ""}
            >
              ${escapeHtml(t(definition.nameKey))} - ${escapeHtml(instance.item.id)}
            </option>
          `;
        })
        .join("")}
    </select>
  `;
}

function renderLabNumberInput(
  label: string,
  value: number,
  min: number,
  max: number,
  attributes: string,
  disabled = false,
): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="${min}"
        max="${max}"
        value="${value}"
        ${attributes}
        ${disabled ? "disabled" : ""}
      />
    </label>
  `;
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
  document.querySelector<HTMLSelectElement>("#setupMode")?.addEventListener("change", (event) => {
    setupMode = (event.currentTarget as HTMLSelectElement).value as SetupMode;
    openSetup();
    render();
  });

  document
    .querySelector<HTMLSelectElement>("#scenarioSelect")
    ?.addEventListener("change", (event) => {
      selectedScenarioId = (event.currentTarget as HTMLSelectElement).value;
      openSetup();
      render();
    });

  document
    .querySelector<HTMLInputElement>("[data-lab-seed]")
    ?.addEventListener("change", (event) => {
      const seed = (event.currentTarget as HTMLInputElement).value.trim();
      if (seed) {
        battleLabConfig.seed = seed;
      }
      commitBattleLabChange();
    });

  document
    .querySelector<HTMLSelectElement>("#battleLabItemSourceMode")
    ?.addEventListener("change", (event) => {
      battleLabItemSourceMode = (event.currentTarget as HTMLSelectElement)
        .value as BattleLabItemSourceMode;
      if (battleLabItemSourceMode === "free") {
        clearBattleLabInventorySources();
      }
      commitBattleLabChange();
    });

  document
    .querySelector<HTMLTextAreaElement>("#battleLabJson")
    ?.addEventListener("input", (event) => {
      battleLabJsonText = (event.currentTarget as HTMLTextAreaElement).value;
    });

  document
    .querySelector<HTMLButtonElement>("#saveBattleLabPreset")
    ?.addEventListener("click", () => {
      try {
        const name = document.querySelector<HTMLInputElement>("#battleLabPresetName")?.value ?? "";
        if (!name.trim()) {
          throw new Error(t("ui.presetNameRequired"));
        }
        saveBattleLabPreset(name, battleLabConfig);
        battleLabFeedback = {
          type: "success",
          message: formatMessage("ui.presetSaved", { name: name.trim() }),
        };
      } catch (error) {
        battleLabFeedback = labErrorFeedback(error);
      }
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#loadBattleLabPreset")
    ?.addEventListener("click", () => {
      try {
        const name = selectedBattleLabPresetName();
        replaceBattleLabConfig(loadBattleLabPreset(name));
        battleLabJsonText = serializeBattleLabConfig(battleLabConfig);
        battleLabFeedback = {
          type: "success",
          message: formatMessage("ui.presetLoaded", { name }),
        };
        state = createState();
      } catch (error) {
        battleLabFeedback = labErrorFeedback(error);
      }
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#deleteBattleLabPreset")
    ?.addEventListener("click", () => {
      try {
        const name = selectedBattleLabPresetName();
        deleteBattleLabPreset(name);
        battleLabFeedback = {
          type: "success",
          message: formatMessage("ui.presetDeleted", { name }),
        };
      } catch (error) {
        battleLabFeedback = labErrorFeedback(error);
      }
      render();
    });

  document.querySelector<HTMLButtonElement>("#exportBattleLab")?.addEventListener("click", () => {
    battleLabJsonText = serializeBattleLabConfig(battleLabConfig);
    battleLabFeedback = { type: "success", message: t("ui.loadoutExported") };
    render();
  });

  document.querySelector<HTMLButtonElement>("#importBattleLab")?.addEventListener("click", () => {
    try {
      const text =
        document.querySelector<HTMLTextAreaElement>("#battleLabJson")?.value ?? battleLabJsonText;
      replaceBattleLabConfig(parseBattleLabConfigJson(text));
      battleLabJsonText = serializeBattleLabConfig(battleLabConfig);
      battleLabFeedback = { type: "success", message: t("ui.loadoutImported") };
      state = createState();
    } catch (error) {
      battleLabFeedback = {
        type: "error",
        message: formatMessage("ui.loadoutImportFailed", {
          reason: error instanceof Error ? error.message : String(error),
        }),
      };
    }
    render();
  });

  document.querySelector<HTMLButtonElement>("#runBattleLabBatch")?.addEventListener("click", () => {
    try {
      battleLabSimulationResults = runBattleLabBatch(battleLabConfig);
      battleLabFeedback = {
        type: "success",
        message: t("ui.batchSimulationCompleted"),
      };
    } catch (error) {
      battleLabFeedback = labErrorFeedback(error);
    }
    render();
  });

  document
    .querySelector<HTMLSelectElement>("#forgeRecipeSelect")
    ?.addEventListener("change", (event) => {
      selectedForgeRecipeId = (event.currentTarget as HTMLSelectElement).value;
      forgeFeedback = null;
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#craftSelectedRecipe")
    ?.addEventListener("click", () => {
      craftSelectedRecipe();
      render();
    });

  document.querySelector<HTMLButtonElement>("#restockForge")?.addEventListener("click", () => {
    developmentInventory = {
      ...developmentInventory,
      stock: createDefaultDevelopmentInventory(definitions.materials).stock,
    };
    persistDevelopmentInventory();
    forgeFeedback = { type: "success", message: t("ui.materialsRestocked") };
    render();
  });

  document
    .querySelector<HTMLButtonElement>("#resetDevelopmentInventory")
    ?.addEventListener("click", () => {
      resetDevelopmentInventory();
      render();
    });

  document
    .querySelector<HTMLTextAreaElement>("#forgeInventoryJson")
    ?.addEventListener("input", (event) => {
      forgeInventoryJsonText = (event.currentTarget as HTMLTextAreaElement).value;
    });

  document
    .querySelector<HTMLButtonElement>("#exportDevelopmentInventory")
    ?.addEventListener("click", () => {
      exportDevelopmentInventory();
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#importDevelopmentInventory")
    ?.addEventListener("click", () => {
      importDevelopmentInventory();
      render();
    });

  document.querySelectorAll<HTMLButtonElement>("[data-forge-stock-material]").forEach((button) => {
    button.addEventListener("click", () => {
      const materialId = button.dataset.forgeStockMaterial;
      const delta = Number.parseInt(button.dataset.forgeStockDelta ?? "0", 10);
      if (materialId && Number.isFinite(delta)) {
        adjustForgeStock(materialId, delta);
      }
      render();
    });
  });

  document
    .querySelector<HTMLSelectElement>("#inventoryTypeFilter")
    ?.addEventListener("change", (event) => {
      inventoryTypeFilter = (event.currentTarget as HTMLSelectElement).value as InventoryTypeFilter;
      render();
    });

  document
    .querySelector<HTMLSelectElement>("#inventoryRarityFilter")
    ?.addEventListener("change", (event) => {
      inventoryRarityFilter = (event.currentTarget as HTMLSelectElement)
        .value as InventoryRarityFilter;
      render();
    });

  document
    .querySelector<HTMLSelectElement>("#inventoryElementFilter")
    ?.addEventListener("change", (event) => {
      inventoryElementFilter = (event.currentTarget as HTMLSelectElement)
        .value as InventoryElementFilter;
      render();
    });

  document
    .querySelector<HTMLInputElement>("#developmentLoadoutName")
    ?.addEventListener("input", (event) => {
      developmentLoadoutName = (event.currentTarget as HTMLInputElement).value;
    });

  document.querySelectorAll<HTMLInputElement>("[data-loadout-ring-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const ringId = input.dataset.loadoutRingId;
      if (ringId) {
        setLoadoutRingSelection(ringId, input.checked);
      }
      render();
    });
  });

  document
    .querySelector<HTMLButtonElement>("#saveDevelopmentLoadout")
    ?.addEventListener("click", () => {
      saveCurrentDevelopmentLoadout();
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#loadDevelopmentLoadout")
    ?.addEventListener("click", () => {
      loadSelectedDevelopmentLoadout();
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#deleteDevelopmentLoadout")
    ?.addEventListener("click", () => {
      deleteSelectedDevelopmentLoadout();
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#sendLoadoutToPlayerOne")
    ?.addEventListener("click", () => {
      applyDevelopmentLoadoutToBattleLabPlayer(0);
      render();
    });

  document
    .querySelector<HTMLButtonElement>("#sendLoadoutToPlayerTwo")
    ?.addEventListener("click", () => {
      applyDevelopmentLoadoutToBattleLabPlayer(1);
      render();
    });

  document.querySelectorAll<HTMLButtonElement>("[data-improve-quality-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.improveQualityType as CraftedItemInstance["type"] | undefined;
      const instanceId = button.dataset.improveQualityId;
      if (type && instanceId) {
        improveInventoryItemQuality(type, instanceId);
      }
      render();
    });
  });

  document
    .querySelectorAll<HTMLButtonElement>("[data-improve-sockets-ring-id]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const ringId = button.dataset.improveSocketsRingId;
        if (ringId) {
          improveInventoryRingSockets(ringId);
        }
        render();
      });
    });

  document.querySelectorAll<HTMLButtonElement>("[data-socket-gem-ring-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const ringId = button.dataset.socketGemRingId;
      const gemId = ringId
        ? Array.from(document.querySelectorAll<HTMLSelectElement>("[data-socket-gem-select]")).find(
            (select) => select.dataset.socketGemSelect === ringId,
          )?.value
        : undefined;
      if (ringId && gemId) {
        socketGemIntoRing(ringId, gemId);
      }
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-unsocket-gem-ring-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const ringId = button.dataset.unsocketGemRingId;
      const gemId = button.dataset.unsocketGemId;
      if (ringId && gemId) {
        unsocketGemFromRing(ringId, gemId);
      }
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-enchant-gem-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const gemId = button.dataset.enchantGemId;
      const enchantmentValue = gemId
        ? Array.from(
            document.querySelectorAll<HTMLSelectElement>("[data-enchant-gem-select]"),
          ).find((select) => select.dataset.enchantGemSelect === gemId)?.value
        : undefined;
      if (gemId && enchantmentValue) {
        enchantGem(gemId, enchantmentValue);
      }
      render();
    });
  });

  document
    .querySelectorAll<HTMLButtonElement>("[data-remove-gem-enchantment]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const gemId = button.dataset.removeGemEnchantment;
        if (gemId) {
          removeGemEnchantment(gemId);
        }
        render();
      });
    });

  document.querySelectorAll<HTMLInputElement>("[data-lab-player-field]").forEach((input) => {
    input.addEventListener("change", () => {
      const player = battleLabConfig.players[Number(input.dataset.labPlayerIndex)];
      if (!player) {
        return;
      }

      if (input.dataset.labPlayerField === "username") {
        const username = input.value.trim();
        if (username) {
          player.username = username;
        }
      } else {
        player.level = clampInteger(input.value, 1, 50);
      }
      commitBattleLabChange();
    });
  });

  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-lab-ring-field]")
    .forEach((control) => {
      control.addEventListener("change", () => {
        const ring = getBattleLabRing(control);
        const field = control.dataset.labRingField;
        if (!ring || !field) {
          return;
        }

        if (field === "definitionId") {
          ring.definitionId = control.value;
          ring.sourceInstanceId = undefined;
          ring.socketCount = undefined;
        } else if (field === "sourceInstanceId") {
          applyInventoryRingSource(ring, control.value);
        } else if (field === "level") {
          ring.level = clampInteger(control.value, 1, 50);
        } else if (field === "quality") {
          ring.quality = clampInteger(control.value, 0, 100);
        }
        commitBattleLabChange();
      });
    });

  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-lab-gem-field]")
    .forEach((control) => {
      control.addEventListener("change", () => {
        const gem = getBattleLabGem(control);
        const field = control.dataset.labGemField;
        if (!gem || !field) {
          return;
        }

        if (field === "definitionId") {
          gem.definitionId = control.value;
          gem.sourceInstanceId = undefined;
        } else if (field === "sourceInstanceId") {
          applyInventoryGemSource(gem, control.value);
        } else if (field === "level") {
          gem.level = clampInteger(control.value, 1, 50);
        } else if (field === "quality") {
          gem.quality = clampInteger(control.value, 0, 100);
        }
        commitBattleLabChange();
      });
    });

  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-lab-enchantment-field]")
    .forEach((control) => {
      control.addEventListener("change", () => {
        const gem = getBattleLabGem(control);
        const field = control.dataset.labEnchantmentField;
        if (!gem || !field) {
          return;
        }

        if (field === "type") {
          gem.enchantment =
            control.value === "monster" || control.value === "spell"
              ? createDefaultLabEnchantment(control.value)
              : undefined;
        } else if (gem.enchantment && field === "definitionId") {
          gem.enchantment.definitionId = control.value;
          gem.enchantment.sourceInstanceId = undefined;
        } else if (gem.enchantment && field === "sourceInstanceId") {
          applyInventoryEnchantmentSource(gem.enchantment, control.value);
        } else if (gem.enchantment && field === "level") {
          gem.enchantment.level = clampInteger(control.value, 1, 50);
        } else if (gem.enchantment && field === "quality") {
          gem.enchantment.quality = clampInteger(control.value, 0, 100);
        }
        commitBattleLabChange();
      });
    });

  document.querySelectorAll<HTMLButtonElement>("[data-lab-add-ring]").forEach((button) => {
    button.addEventListener("click", () => {
      const player = battleLabConfig.players[Number(button.dataset.labAddRing)];
      if (player && player.rings.length < 10) {
        player.rings.push(createDefaultLabRing());
      }
      commitBattleLabChange();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-lab-remove-ring]").forEach((button) => {
    button.addEventListener("click", () => {
      const [playerIndex, ringIndex] = parseIndexPath(button.dataset.labRemoveRing);
      const player = battleLabConfig.players[playerIndex];
      if (player && player.rings.length > 1) {
        player.rings.splice(ringIndex, 1);
      }
      commitBattleLabChange();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-lab-add-gem]").forEach((button) => {
    button.addEventListener("click", () => {
      const [playerIndex, ringIndex] = parseIndexPath(button.dataset.labAddGem);
      const ring = battleLabConfig.players[playerIndex]?.rings[ringIndex];
      if (ring && ring.gems.length < 3) {
        ring.gems.push(createDefaultLabGem());
      }
      commitBattleLabChange();
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-lab-remove-gem]").forEach((button) => {
    button.addEventListener("click", () => {
      const [playerIndex, ringIndex, gemIndex] = parseIndexPath(button.dataset.labRemoveGem);
      battleLabConfig.players[playerIndex]?.rings[ringIndex]?.gems.splice(gemIndex, 1);
      commitBattleLabChange();
    });
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
    .querySelector<HTMLButtonElement>("#claimBattleRewards")
    ?.addEventListener("click", () => {
      claimBattleRewards();
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

function commitBattleLabChange(): void {
  state = createState();
  errorMessage = null;
  battleLabFeedback = null;
  battleLabSimulationResults = [];
  render();
}

function selectedBattleLabPresetName(): string {
  const name = document.querySelector<HTMLSelectElement>("#battleLabPresetSelect")?.value ?? "";
  if (!name) {
    throw new Error(t("ui.presetSelectionRequired"));
  }
  return name;
}

function replaceBattleLabConfig(config: BattleLabConfig): void {
  battleLabConfig.id = config.id;
  battleLabConfig.seed = config.seed;
  battleLabConfig.players.splice(0, battleLabConfig.players.length, ...config.players);
  battleLabSimulationResults = [];
}

function clearBattleLabInventorySources(): void {
  for (const player of battleLabConfig.players) {
    for (const ring of player.rings) {
      ring.sourceInstanceId = undefined;
      ring.socketCount = undefined;
      for (const gem of ring.gems) {
        gem.sourceInstanceId = undefined;
        if (gem.enchantment) {
          gem.enchantment.sourceInstanceId = undefined;
        }
      }
    }
  }
}

function labErrorFeedback(error: unknown): BattleLabFeedback {
  return {
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  };
}

function getBattleLabRing(
  control: HTMLInputElement | HTMLSelectElement,
): BattleLabRingConfig | undefined {
  return battleLabConfig.players[Number(control.dataset.labPlayerIndex)]?.rings[
    Number(control.dataset.labRingIndex)
  ];
}

function getBattleLabGem(
  control: HTMLInputElement | HTMLSelectElement,
): BattleLabGemConfig | undefined {
  return getBattleLabRing(control)?.gems[Number(control.dataset.labGemIndex)];
}

function createDefaultLabRing(): BattleLabRingConfig {
  return {
    definitionId: definitions.rings[0]?.id ?? "",
    level: 1,
    quality: 0,
    gems: [],
  };
}

function createDefaultLabGem(): BattleLabGemConfig {
  return {
    definitionId: definitions.gems[0]?.id ?? "",
    level: 1,
    quality: 0,
  };
}

function createDefaultLabEnchantment(
  type: BattleLabEnchantmentConfig["type"],
): BattleLabEnchantmentConfig {
  return {
    type,
    definitionId:
      type === "monster" ? (definitions.monsters[0]?.id ?? "") : (definitions.spells[0]?.id ?? ""),
    level: 1,
    quality: 0,
  };
}

function clampInteger(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
}

function parseIndexPath(path: string | undefined): number[] {
  return (path ?? "").split(":").map((value) => Number(value));
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
    battleRewardsClaimed = true;
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
  battleRewardsClaimed = false;
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
  battleRewardsClaimed = false;
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
  battleRewardsClaimed = false;
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
                ${escapeHtml(t("ui.damage"))} ${renderResolvedValue(ringTotalDamage(ring), baseRingTotalDamage(ring))} /
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
                    ${escapeHtml(t(monster.nameKey))} -
                    ${escapeHtml(t("ui.damage"))} ${renderResolvedValue(monster.damage, baseMonsterDamage(monster.definitionId))} /
                    ${escapeHtml(t("ui.cooldown"))} ${monster.currentCooldown}
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

function renderBattleRewardsPanel(): string {
  if (state.status !== "finished" || !state.result || isReplayLocked()) {
    return "";
  }

  const rewards = battleRewardPreview(state.result);
  const materialLabels = rewards.materials
    .map((reward) => {
      const material = materialDefinition(reward.materialId);
      return `${t(material.nameKey)} x${reward.quantity}`;
    })
    .join(t("ui.listSeparator"));
  const itemXpLabels = rewards.itemXp
    .map((reward) => {
      const crafted = craftedItemById(reward.type, reward.sourceInstanceId);
      const definition = crafted ? itemDefinition(crafted.type, crafted.item.definitionId) : null;
      return `${definition ? t(definition.nameKey) : reward.sourceInstanceId} +${reward.xp} XP`;
    })
    .join(t("ui.listSeparator"));

  return `
    <section class="panel battle-rewards">
      <div>
        <h2>${escapeHtml(t("ui.battleRewards"))}</h2>
        <p>${escapeHtml(t(rewards.reasonKey))}</p>
      </div>
      <dl class="reward-summary">
        ${stat(t("ui.credits"), `+${rewards.credits}`)}
        ${stat(t("ui.materials"), materialLabels || t("ui.none"))}
        ${stat(t("ui.itemXp"), itemXpLabels || t("ui.noSourceBackedItemXp"))}
      </dl>
      <button id="claimBattleRewards" ${battleRewardsClaimed ? "disabled" : ""}>
        ${escapeHtml(battleRewardsClaimed ? t("ui.rewardsClaimed") : t("ui.claimRewards"))}
      </button>
    </section>
  `;
}

function renderBattleResultSummaryPanel(): string {
  const summary = battleResultSummary();
  if (!summary) {
    return "";
  }

  const itemXpLabels = summary.itemXp
    .map((reward) => {
      const crafted = craftedItemById(reward.type, reward.sourceInstanceId);
      const definition = crafted ? itemDefinition(crafted.type, crafted.item.definitionId) : null;
      return `${definition ? t(definition.nameKey) : reward.sourceInstanceId} +${reward.xp} XP`;
    })
    .join(t("ui.listSeparator"));

  return `
    <section class="panel battle-result-summary">
      <div>
        <h2>${escapeHtml(t("ui.battleResultSummary"))}</h2>
        <p>${escapeHtml(summary.resultLabel)}</p>
      </div>
      <dl class="result-summary-stats">
        ${stat(t("ui.turns"), String(summary.turnCount))}
        ${stat(t("ui.actionsPlayed"), String(summary.actionCount))}
        ${stat(t("ui.rewardsStatus"), t(summary.rewardsStatusKey))}
      </dl>
      <div class="result-summary-grid">
        <section>
          <h3>${escapeHtml(t("ui.damageByPlayer"))}</h3>
          <dl class="compact-stat-list">
            ${summary.damageByPlayer
              .map((entry) => stat(entry.playerName, String(entry.damage)))
              .join("")}
          </dl>
        </section>
        <section>
          <h3>${escapeHtml(t("ui.ringsUsed"))}</h3>
          ${renderResultUsageList(summary.ringsUsed)}
        </section>
        <section>
          <h3>${escapeHtml(t("ui.spellsCast"))}</h3>
          ${renderResultUsageList(summary.spellsCast)}
        </section>
        <section>
          <h3>${escapeHtml(t("ui.monstersSummoned"))}</h3>
          ${renderResultUsageList(summary.monstersSummoned)}
        </section>
        <section>
          <h3>${escapeHtml(t("ui.monstersUsed"))}</h3>
          ${renderResultUsageList(summary.monstersUsed)}
        </section>
        <section>
          <h3>${escapeHtml(t("ui.itemXpGenerated"))}</h3>
          <p class="result-summary-copy">
            ${escapeHtml(itemXpLabels || t("ui.noSourceBackedItemXp"))}
          </p>
        </section>
      </div>
    </section>
  `;
}

function renderResultUsageList(
  entries: ReadonlyArray<{ id: string; label: string; count: number }>,
): string {
  if (entries.length === 0) {
    return `<p class="result-summary-copy">${escapeHtml(t("ui.none"))}</p>`;
  }

  return `
    <ul class="result-usage-list">
      ${entries
        .map(
          (entry) => `
            <li>
              <span>${escapeHtml(entry.label)}</span>
              <strong>x${entry.count}</strong>
            </li>
          `,
        )
        .join("")}
    </ul>
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
        <span>${escapeHtml(t("ui.damage"))} ${renderResolvedValue(monster.damage, baseMonsterDamage(monster.definitionId))}</span>
        <span>${escapeHtml(t("ui.health"))} ${renderResolvedValue(monster.health, baseMonsterHealth(monster.definitionId))}/${renderResolvedValue(monster.maxHealth, baseMonsterHealth(monster.definitionId))}</span>
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
        <span>${escapeHtml(t("ui.damage"))} ${renderResolvedValue(ringTotalDamage(ring), baseRingTotalDamage(ring))}</span>
        <span>${escapeHtml(t("ui.energy"))} ${ring.energyCost}</span>
        <span>${escapeHtml(t("ui.cooldown"))} ${ring.currentCooldown}/${ring.cooldown}</span>
      </span>
      <span class="ring-state">${escapeHtml(unavailableReason ? t(unavailableReason) : t("ui.ready"))}</span>
      <span class="ring-gems">
        ${Array.from({ length: 3 }, (_, index) => {
          const gem = ring.gems[index];
          return `<span class="${
            gem
              ? `filled item-artwork gem-artwork ${rarityClass(gem.rarity)} element-${gem.element}`
              : ""
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
    ring.gems
      .filter((gem) => gem.enchantment?.type === "spell")
      .flatMap((gem) => {
        if (gem.enchantment?.type !== "spell") return [];
        const spell =
          state.definitions.spells[gem.enchantment.resolvedDefinitionId ?? gem.enchantment.spellId];
        if (!spell || spell.targeting?.selection === "none") return [];
        const selected = [targetId, ...allCombatTargetIds().filter((id) => id !== targetId)].find(
          (candidate) => manualSpellTargetAllowed(activePlayer.id, spell, candidate),
        );
        return selected ? [[gem.id, selected] as const] : [];
      }),
  );

  applyManualAction({
    type: "useRing",
    playerId: activePlayer.id,
    ringInstanceId,
    targetId,
    enchantmentTargets,
  });
}

function allCombatTargetIds(): TargetId[] {
  return state.players.flatMap((player) => [
    `${player.id}.hero` as TargetId,
    ...player.monsters.map((monster) => monster.id as TargetId),
  ]);
}

function manualSpellTargetAllowed(
  sourcePlayerId: string,
  spell: BattleState["definitions"]["spells"][string],
  targetId: TargetId,
): boolean {
  const target = findTarget(targetId);
  if (!target) return false;
  const allowed = (spell.targeting?.allowedTargets ?? ["anyCombatant"]).some((rule) => {
    if (rule === "anyCombatant") return true;
    if (target.kind !== "monster") return false;
    if (rule === "anyMonster") return true;
    return rule === "alliedMonster"
      ? target.player.id === sourcePlayerId
      : target.player.id !== sourcePlayerId;
  });
  if (!allowed) return false;
  return (
    !spell.effects.some((effect) => effect.type === "dealDamage") || !targetDisabledReason(targetId)
  );
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
                  ${resolvedStat(t("ui.damage"), ringTotalDamage(ring), baseRingTotalDamage(ring))}
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
                      <span>${escapeHtml(t("ui.health"))} ${renderResolvedValue(monster.health, baseMonsterHealth(monster.definitionId))}/${renderResolvedValue(monster.maxHealth, baseMonsterHealth(monster.definitionId))}</span>
                      <span>${escapeHtml(t("ui.damage"))} ${renderResolvedValue(monster.damage, baseMonsterDamage(monster.definitionId))}</span>
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
                  ${resolvedStat(t("ui.damage"), ringTotalDamage(ring), baseRingTotalDamage(ring))}
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
        ${resolvedStat(t("ui.damage"), gem.damage, baseGemDamage(gem.definitionId))}
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

function baseRingTotalDamage(ring: RingView): number {
  return (
    baseRingDamage(ring.definitionId) +
    ring.gems.reduce((sum, gem) => sum + baseGemDamage(gem.definitionId), 0)
  );
}

function baseRingDamage(definitionId: string): number {
  return definitions.rings.find((ring) => ring.id === definitionId)?.baseDamage ?? 0;
}

function baseGemDamage(definitionId: string): number {
  return definitions.gems.find((gem) => gem.id === definitionId)?.baseDamage ?? 0;
}

function baseMonsterHealth(definitionId: string): number {
  return definitions.monsters.find((monster) => monster.id === definitionId)?.baseHealth ?? 0;
}

function baseMonsterDamage(definitionId: string): number {
  return definitions.monsters.find((monster) => monster.id === definitionId)?.baseDamage ?? 0;
}

function baseSpellDamage(definitionId: string): number {
  const spell = definitions.spells.find((candidate) => candidate.id === definitionId);
  return (
    spell?.effects.reduce(
      (sum, effect) =>
        sum +
        (effect.type === "dealDamage" || effect.type === "dealDamageToAll"
          ? (effect.amount ?? 0)
          : 0),
      0,
    ) ?? 0
  );
}

function renderResolvedValue(value: number, baseValue: number): string {
  const boosted = value > baseValue;
  const title = boosted
    ? ` title="${escapeHtml(formatMessage("ui.baseStatValue", { value: String(baseValue) }))}"`
    : "";
  return `<span class="${boosted ? "resolved-stat boosted" : "resolved-stat"}"${title}>${value}</span>`;
}

function resolvedStat(label: string, value: number, baseValue: number): string {
  return statHtml(label, renderResolvedValue(value, baseValue));
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
    action.type === "resolveOpeningDuelTimeout"
      ? (action.timedOutPlayerId ?? t("ui.draw"))
      : action.type === "useRing"
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
    case "elementDuelTiebreaker":
      return formatMessage("event.elementDuelTiebreaker", {
        player: playerLabel(event.playerId),
        tieCount: String(event.tieCount),
      });
    case "openingDuelTimedOut":
      return event.timedOutPlayerId
        ? formatMessage("event.openingDuelTimedOut.player", {
            player: playerLabel(event.timedOutPlayerId),
          })
        : t("event.openingDuelTimedOut.draw");
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
        target: event.targetId ? targetLabel(event.targetId) : t("ui.none"),
      });
    case "statusApplied":
      return event.expires === "endOfCurrentTurn"
        ? formatMessage("event.statusAppliedUntilEndOfTurn", {
            monster: combatObjectLabel(event.monsterInstanceId),
            status: t(`ui.status.${event.status}`),
          })
        : formatMessage("event.statusApplied", {
            monster: combatObjectLabel(event.monsterInstanceId),
            status: t(`ui.status.${event.status}`),
            turns: String(event.remainingOwnerTurns),
          });
    case "statusRemoved":
      return formatMessage(`event.statusRemoved.${event.reason}`, {
        monster: combatObjectLabel(event.monsterInstanceId),
        status: t(`ui.status.${event.status}`),
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
    case "skillGranted":
      return formatMessage("event.skillGranted", {
        monster: combatObjectLabel(event.monsterInstanceId),
        skill: event.skill,
      });
    case "shieldGranted":
      return formatMessage("event.shieldGranted", {
        monster: combatObjectLabel(event.monsterInstanceId),
      });
    case "shieldExpired":
      return formatMessage("event.shieldExpired", {
        monster: combatObjectLabel(event.monsterInstanceId),
      });
    case "randomTargetSelected":
      return formatMessage("event.randomTargetSelected", {
        target: combatObjectLabel(event.targetId),
      });
    case "triggerRegistered":
      return formatMessage("event.triggerRegistered", {
        spell: spellLabel(event.sourceSpellId),
        ring: ringLabel(event.ringInstanceId),
      });
    case "triggerActivated":
      return formatMessage("event.triggerActivated", {
        spell: spellLabel(event.sourceSpellId),
      });
    case "ringDamageChanged":
      return formatMessage("event.ringDamageChanged", {
        ring: ringLabel(event.ringInstanceId),
        from: String(event.from),
        to: String(event.to),
      });
    case "monsterDamageChanged":
      return formatMessage("event.monsterDamageChanged", {
        monster: combatObjectLabel(event.monsterInstanceId),
        from: String(event.from),
        to: String(event.to),
      });
    case "energyRestored":
      return formatMessage("event.energyRestored", {
        player: playerLabel(event.playerId),
        amount: String(event.amount),
        current: String(event.current),
      });
    case "actionPierceOverflow":
      return formatMessage("event.actionPierceOverflow", {
        spell: spellLabel(event.sourceSpellId),
        amount: String(event.amount),
        hero: targetLabel(event.targetHeroId),
      });
    case "lastBreathTriggered":
      return formatMessage("event.lastBreathTriggered", {
        monster: combatObjectLabel(event.monsterInstanceId),
        target: event.targetId ? targetLabel(event.targetId) : t("ui.none"),
      });
    case "monsterCopied":
      return formatMessage(
        event.temporary ? "event.monsterCopied.temporary" : "event.monsterCopied",
        {
          source: combatObjectLabel(event.sourceMonsterInstanceId),
          monster: combatObjectLabel(event.monsterInstanceId),
          player: playerLabel(event.playerId),
        },
      );
    case "monsterTransformed":
      return formatMessage("event.monsterTransformed", {
        monster: combatObjectLabel(event.monsterInstanceId),
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
        ...(event.targetId ? [["ui.targetId", event.targetId] as [string, string]] : []),
      ];
    case "statusApplied":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.spellId", event.sourceSpellId],
      ];
    case "statusRemoved":
      return [["ui.monsterInstanceId", event.monsterInstanceId]];
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
    case "skillGranted":
    case "shieldGranted":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.spellId", event.sourceSpellId],
      ];
    case "shieldExpired":
      return [["ui.monsterInstanceId", event.monsterInstanceId]];
    case "randomTargetSelected":
      return [
        ["ui.targetId", event.targetId],
        ["ui.spellId", event.sourceSpellId],
      ];
    case "triggerRegistered":
      return [
        ["ui.spellId", event.sourceSpellId],
        ["ui.ringId", event.ringInstanceId],
      ];
    case "triggerActivated":
      return [
        ["ui.spellId", event.sourceSpellId],
        ["ui.sourceId", event.sourceId],
        ...(event.targetId ? [["ui.targetId", event.targetId] as [string, string]] : []),
      ];
    case "ringDamageChanged":
      return [["ui.ringId", event.ringInstanceId]];
    case "monsterDamageChanged":
    case "lastBreathTriggered":
      return [["ui.monsterInstanceId", event.monsterInstanceId]];
    case "monsterCopied":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.sourceId", event.sourceMonsterInstanceId],
      ];
    case "monsterTransformed":
      return [
        ["ui.monsterInstanceId", event.monsterInstanceId],
        ["ui.spellId", event.sourceSpellId],
      ];
    case "energyRestored":
      return [];
    case "actionPierceOverflow":
      return [
        ["ui.spellId", event.sourceSpellId],
        ["ui.targetId", event.targetHeroId],
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

function statHtml(label: string, valueHtml: string): string {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${valueHtml}</dd>
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
