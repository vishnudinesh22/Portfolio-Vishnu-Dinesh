export const STORY_STORAGE_KEY = "a-day-in-my-world-story-v1";
const categories = new Set(["uiux", "industrial"]);

// One state machine owns ordering, unique completions, restoration, and category changes.
export function createQuestMachine(quests, storage) {
  let completed = [];
  let selectedCategory = null;
  let pending = null;
  try {
    const saved = JSON.parse(storage?.getItem(STORY_STORAGE_KEY) || "null");
    if (saved?.version === 1 && Array.isArray(saved.completed)) {
      for (const quest of quests) {
        if (saved.completed[completed.length] !== quest.id) break;
        completed.push(quest.id);
      }
      if (categories.has(saved.selectedCategory) && completed.length >= 5) selectedCategory = saved.selectedCategory;
      // Older saves completed on selection; require a workstation visit after migration.
      if (completed.length === 6 && (!selectedCategory || saved.rules !== 2)) completed.pop();
    }
  } catch { /* Invalid or unavailable persistence starts a fresh, usable story. */ }
  function save() {
    try { storage?.setItem(STORY_STORAGE_KEY, JSON.stringify({ version: 1, rules: 2, completed, selectedCategory })); } catch { /* Optional storage. */ }
  }
  function getState() {
    return {
      completed: [...completed],
      selectedCategory,
      questIndex: Math.min(completed.length, quests.length - 1),
      progress: Math.round(completed.length / quests.length * 100),
      selectionReady: completed.length >= 5,
      storyComplete: completed.length === 6,
      phase: pending ? "COMPLETION_DIALOGUE" : completed.length === 6 ? "STORY_COMPLETE" : completed.length === 5 && !selectedCategory ? "PORTFOLIO_SELECTION" : "QUEST_ACTIVE",
      pending,
      time: completed.length >= 2 ? "6 PM" : "4 PM",
    };
  }
  function dispatch(action) {
    let completedNow = false;
    let changed = false;
    if (action.type === "restart") {
      completed = [];
      selectedCategory = null;
      pending = null;
      changed = true;
    } else if (action.type === "interact" && !pending && completed.length < 5 && quests[completed.length].id === action.id) {
      pending = action.id;
      changed = true;
    } else if (action.type === "dialogue-finished" && pending === action.id) {
      completed.push(pending);
      pending = null;
      completedNow = changed = true;
    } else if (action.type === "choose" && completed.length >= 5 && categories.has(action.category)) {
      changed = selectedCategory !== action.category;
      selectedCategory = action.category;
    } else if (action.type === "visit" && completed.length === 5 && selectedCategory === action.category) {
      completed.push(quests[5].id);
      completedNow = changed = true;
    }
    if (changed) save();
    return { changed, completedNow, state: getState() };
  }
  return { getState, dispatch };
}
