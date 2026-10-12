import { test } from "node:test";
import assert from "node:assert/strict";
import { createDialogueQueue } from "../src/dialogueQueue.js";

test("thoughts stay readable, play in order, avoid duplicate overlap, and cancel on restart", () => {
  const original = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, document: globalThis.document };
  const timers = new Map();
  let id = 0;
  const paragraph = {};
  const history = { items: [], replaceChildren(...items) { this.items = items; } };
  const element = {
    dataset: {},
    offsetWidth: 280,
    offsetHeight: 100,
    style: { setProperty() {} },
    querySelector: () => paragraph,
    setAttribute() {},
  };
  function tick() {
    const [key, timer] = timers.entries().next().value;
    timers.delete(key);
    timer.callback();
    return timer.milliseconds;
  }
  try {
    globalThis.setTimeout = (callback, milliseconds) => { timers.set(++id, { callback, milliseconds }); return id; };
    globalThis.clearTimeout = key => timers.delete(key);
    globalThis.document = { createElement: () => ({}) };
    const queue = createDialogueQueue(element, history);
    queue.enqueue(["First thought", "Second thought"]);
    queue.enqueue(["First thought", "Second thought"]);
    assert.equal(paragraph.textContent, "First thought");
    assert.equal(queue.isActive(), true);
    assert.ok(tick() >= 2200, "A short thought gets a readable duration without gating gameplay");
    assert.equal(queue.isActive(), false, "Fade-out gap separates messages");
    assert.equal(tick(), 180);
    assert.equal(paragraph.textContent, "Second thought");
    assert.equal(history.items.length, 2);
    queue.position({ x: 4, y: 30 }, { width: 390, height: 844 }, [{ left: 0, right: 300, top: 0, bottom: 120 }]);
    assert.equal(element.style.left, "8px");
    assert.equal(element.style.top, "128px");
    queue.position({ x: 195, y: 522 }, { width: 390, height: 844 }, [], [{ left: 143, right: 248, top: 420, bottom: 500 }]);
    assert.equal(element.style.top, "260px", "Bubble leaves the nearby prop visible");
    queue.clear();
    let reactions = 0;
    queue.enqueue([{ text: "Voluntary dismissal", onEnd: () => reactions++ }, "Next reaction"]);
    queue.pause();
    assert.equal(timers.size,0,"Restart confirmation pauses dialogue timers");
    queue.advance();
    assert.equal(reactions,0,"Space cannot advance paused dialogue");
    queue.resume();
    assert.equal(timers.size,1,"Continuing restores exactly one timer");
    queue.advance();
    queue.advance();
    assert.equal(reactions, 1, "Repeated dismissal cannot repeat a quest transition");
    assert.equal(timers.size, 1);
    tick();
    assert.equal(paragraph.textContent, "Next reaction");
    queue.clear();
    assert.equal(timers.size, 0);
    assert.equal(queue.isActive(), false);
    assert.equal(history.items.length, 0);
    queue.enqueue(["Fresh story"]);
    assert.equal(paragraph.textContent, "Fresh story");
    queue.clear();
  } finally {
    globalThis.setTimeout = original.setTimeout;
    globalThis.clearTimeout = original.clearTimeout;
    if (original.document === undefined) delete globalThis.document;
    else globalThis.document = original.document;
  }
});
