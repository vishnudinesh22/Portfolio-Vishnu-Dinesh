export const STORY_STORAGE_KEY = "a-day-in-my-world-story-v1";
import { readStorySave, writeStorySave } from "./storyPersistence.js";
const categories = new Set(["uiux", "industrial"]);

// One state machine owns ordering, unique completions, presentation, and categories.
export function createQuestMachine(quests, storage) {
  const restored=readStorySave(storage,STORY_STORAGE_KEY,quests);
  let completed = restored?.completed || [];
  let selectedCategory = restored?.selectedCategory || null;
  let pending = restored?.pending || null;
  let position=restored?.position || null;
  let thoughtsSeen=restored?.thoughtsSeen || [];
  let completionDismissed=restored?.completionDismissed || false;
  let walking=restored?.walking || false;
  let presentation = null;
  function save() {
    writeStorySave(storage,STORY_STORAGE_KEY,{completed,selectedCategory,pending,position,thoughtsSeen,completionDismissed,walking,
      footballCollected:completed.includes("football"),tvActivated:completed.includes("tv"),certificateCompleted:completed.includes("degree"),
      cyclingCompleted:completed.includes("cycling"),sofaSceneCompleted:completed.includes("couch"),autoWalkCompleted:completed.length===6&&!walking,storyComplete:completed.length===6});
  }
  function getState() {
    return {
      completed: [...completed],
      selectedCategory,
      questIndex: Math.min(completed.length, quests.length - 1),
      progress: Math.round(completed.length / quests.length * 100),
      selectionReady: completed.length >= 5,
      storyComplete: completed.length === 6,
      phase: presentation || (pending ? "COMPLETION_DIALOGUE" : completed.length === 6 ? "STORY_COMPLETE" : completed.length === 5 && !selectedCategory ? "PORTFOLIO_SELECTION" : "QUEST_ACTIVE"),
      pending,
      position:position&&{...position},thoughtsSeen:[...thoughtsSeen],completionDismissed,walking,
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
      presentation = null;
      position=null;thoughtsSeen=[];completionDismissed=false;walking=false;
      try{storage?.removeItem?.(STORY_STORAGE_KEY);}catch{}
      changed = true;
    } else if (action.type === "presentation") {
      presentation = action.phase;
      changed = true;
    } else if(action.type==="snapshot") {
      if(action.position)position={x:action.position.x,y:action.position.y};
      if(action.thought&&!thoughtsSeen.includes(action.thought))thoughtsSeen.push(action.thought);
      if(typeof action.completionDismissed==="boolean")completionDismissed=action.completionDismissed;
      if(typeof action.walking==="boolean")walking=action.walking;
      changed=true;
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
      completionDismissed=false;
      completedNow = changed = true;
    }
    if(changed&&action.type!=="presentation"&&action.type!=="restart")save();
    return { changed, completedNow, state: getState() };
  }
  return { getState, dispatch };
}
