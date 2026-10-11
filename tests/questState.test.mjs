import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuestMachine, STORY_STORAGE_KEY } from "../src/questState.js";
import { portfolioConfig } from "../src/portfolioConfig.js";
const quests = portfolioConfig.story.quests;
function memory(initial) {
  let value = initial;
  return { getItem: () => value, setItem: (key, next) => { assert.equal(key, STORY_STORAGE_KEY); value = next; } };
}
test("six objectives complete only in order; revisits and switching do not add progress", () => {
  const machine = createQuestMachine(quests, memory());
  assert.equal(machine.dispatch({ type: "interact", id: "degree" }).changed, false);
  assert.equal(machine.dispatch({ type: "choose", category: "uiux" }).changed, false);
  for (const quest of quests.slice(0, 5)) {
    assert.equal(machine.dispatch({ type: "interact", id: quest.id }).changed, true);
    assert.equal(machine.getState().phase, "COMPLETION_DIALOGUE");
    assert.equal(machine.dispatch({ type: "interact", id: quest.id }).completedNow, false);
    assert.equal(machine.dispatch({ type: "dialogue-finished", id: quest.id }).completedNow, true);
  }
  assert.equal(machine.getState().progress, 83);
  assert.equal(machine.getState().storyComplete, false);
  assert.equal(machine.dispatch({ type: "choose", category: "uiux" }).completedNow, false);
  assert.equal(machine.dispatch({ type: "visit", category: "industrial" }).completedNow, false);
  assert.equal(machine.getState().progress, 83);
  assert.equal(machine.dispatch({ type: "visit", category: "uiux" }).completedNow, true);
  assert.equal(machine.dispatch({ type: "choose", category: "industrial" }).completedNow, false);
  assert.equal(machine.getState().progress, 100);
  assert.equal(machine.getState().selectedCategory, "industrial");
});
test("saved progress restores clock, selection, and collected objectives; restart is independent", () => {
  const storage = memory();
  const machine = createQuestMachine(quests, storage);
  for (const quest of quests.slice(0, 5)) {
    machine.dispatch({ type: "interact", id: quest.id });
    machine.dispatch({ type: "dialogue-finished", id: quest.id });
  }
  machine.dispatch({ type: "choose", category: "uiux" });
  const restored = createQuestMachine(quests, storage);
  assert.deepEqual(restored.getState(), machine.getState());
  assert.equal(restored.getState().time, "6 PM");
  restored.dispatch({ type: "restart" });
  assert.equal(createQuestMachine(quests, storage).getState().progress, 0);
  assert.equal(restored.getState().time, "4 PM");
});
test("invalid, non-contiguous, and unavailable storage cannot skip objectives or crash the game", () => {
  assert.equal(createQuestMachine(quests, memory("bad json")).getState().progress, 0);
  assert.equal(createQuestMachine(quests, memory(JSON.stringify({ version: 1, completed: ["football", "degree"] }))).getState().completed.length, 1);
  const machine = createQuestMachine(quests, { getItem() { throw Error("disabled"); }, setItem() { throw Error("disabled"); } });
  assert.equal(machine.dispatch({ type: "interact", id: "football" }).changed, true);
  assert.equal(machine.dispatch({ type: "dialogue-finished", id: "football" }).completedNow, true);
});

test("refresh during a reaction safely replays the unfinished objective; old selection saves migrate", () => {
  const storage = memory();
  const machine = createQuestMachine(quests, storage);
  machine.dispatch({ type: "interact", id: "football" });
  const restored = createQuestMachine(quests, storage);
  assert.equal(restored.getState().pending, null);
  assert.equal(restored.getState().progress, 0);
  const old = createQuestMachine(quests, memory(JSON.stringify({ version: 1, completed: quests.map(q => q.id), selectedCategory: "uiux" })));
  assert.equal(old.getState().progress, 83);
});
