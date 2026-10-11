import { portfolioConfig as config } from "./portfolioConfig";
import { scaleFactor } from "./constants";
import { showProximityInfo } from "./utils";
import { setupDiscoveryAudio } from "./discoveryAudio";
import { createQuestMachine } from "./questState";
import { createDialogueQueue } from "./dialogueQueue";
import { createFloatingLabels } from "./floatingLabels";
import { getWorldObjects, workstationLayout } from "./worldObjects";
import { createNavigator } from "./navigation";

export function setupStory(k, map, player, mapData) {
  let storage;
  try { storage = localStorage; } catch { /* Exploration works without persistence. */ }
  const machine = createQuestMachine(config.story.quests, storage);
  const sound = setupDiscoveryAudio(k.audioCtx);
  const objects = getWorldObjects(config, mapData);
  const byId = id => objects.find(object => object.id === id);
  const queue = createDialogueQueue(document.getElementById("thought-bubble"), document.getElementById("recent-thoughts"));
  const updateLabels = createFloatingLabels(document.getElementById("world-labels"), objects.filter(object => object.label));
  const tracker = document.getElementById("quest-tracker");
  const guide = document.getElementById("control-guide");
  const accessible = document.getElementById("accessible-view");
  const actionButton = document.getElementById("interact");
  const choices = document.getElementById("adventure-choices");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let nearby;
  let navigationCategory = machine.getState().selectedCategory;
  let navigating = !machine.getState().storyComplete;
  let choicesOpen = machine.getState().selectionReady && !navigationCategory;
  let pickupUntil = 0;
  let glowUntil = 0;
  let transitionTimer;
  let goal;
  let introducing = false;
  let collapsed = false;
  const startPosition = player.pos.clone();

  document.title = `${config.experienceTitle} | ${config.name}`;
  document.getElementById("identity").textContent = config.experienceTitle;
  document.getElementById("accessible-title").textContent = `${config.name}'s design world`;
  const personalStops = [byId("intro"), byId("football"), byId("cycling"), byId("couch"), byId("tv"), byId("degree")];
  for (const stop of personalStops) {
    const section = document.createElement("section");
    const title = document.createElement("h2");
    const text = document.createElement("p");
    title.textContent = stop.title;
    text.textContent = stop.text;
    section.append(title, text);
    if (stop.note) {
      const note = document.createElement("small");
      note.textContent = stop.note;
      section.append(note);
    }
    document.getElementById("accessible-story").append(section);
  }
  for (const station of objects.filter(object => object.link)) {
    const link = document.createElement("a");
    link.href = station.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = station.label + " ↗";
    document.getElementById("accessible-links").append(link);
    const choice = document.querySelector(`[data-category="${station.id}"]`);
    choice.querySelector("strong").textContent = station.label;
  }

  function closeAccessible() {
    accessible.hidden = true;
    document.getElementById("quick-access").setAttribute("aria-expanded", "false");
    document.getElementById("game").focus({ preventScroll: true });
    renderPanels();
  }
  document.getElementById("quick-access").addEventListener("click", () => {
    accessible.hidden = !accessible.hidden;
    document.getElementById("quick-access").setAttribute("aria-expanded", String(!accessible.hidden));
    if (!accessible.hidden) {
      const title = document.getElementById("accessible-title");
      title.tabIndex = -1;
      title.focus();
      accessible.scrollTop = 0;
    } else document.getElementById("game").focus({ preventScroll: true });
    renderPanels();
  });
  document.getElementById("return-game").addEventListener("click", closeAccessible);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !accessible.hidden) closeAccessible();
  });

  const football = map.add([k.sprite("football"), k.pos(147, 129), k.opacity(1), k.scale(1), "story-football"]);
  football.hidden = machine.getState().completed.includes("football");
  map.add([k.sprite("bicycle"), k.pos(185, 108)]);
  map.add([k.sprite("laptop"), k.pos(workstationLayout.laptop.x, workstationLayout.laptop.y)]);
  const table = workstationLayout.prototype;
  const navigate = createNavigator(mapData.layers.find(layer => layer.name === "boundaries").objects, table);
  map.add([k.sprite("prototype"), k.pos(table.x, table.y)]);
  map.add([k.pos(table.x, table.y + table.solidY), k.area({ shape: new k.Rect(k.vec2(0), table.width, table.solidHeight) }), k.body({ isStatic: true }), "prototype-table"]);
  const tv = mapData.layers.find(layer => layer.name === "boundaries").objects.find(object => object.name === "tv");
  const tvGlow = map.add([k.pos(tv.x + 3, tv.y + 4), k.rect(8, 6), k.color(k.Color.fromHex("#72d8ce")), k.opacity(0), k.z(2)]);

  const markers = objects.filter(object => object.label).map(object => ({
    object,
    marker: map.add([k.pos(object.x, object.y - 17), k.rect(3, 3), k.color(k.Color.fromHex("#ffce88")), k.opacity(0.5), k.z(10)]),
  }));
  const arrow = map.add([k.text("›", { size: 8, font: "Bungee" }), k.pos(), k.anchor("center"), k.rotate(), k.color(k.Color.fromHex("#72d8ce")), k.opacity(0.6), k.z(10)]);

  let attentionUntil = 0;
  let attentionId;
  function refreshQuest() {
    const state = machine.getState();
    const quest = config.story.quests[state.questIndex];
    goal = state.completed.length < 5 ? byId(quest.id) : navigationCategory ? byId(navigationCategory) : undefined;
    if (state.pending || introducing || (state.storyComplete && !navigating)) goal = undefined;
    if (goal?.id !== attentionId) { attentionId = goal?.id; attentionUntil = k.time() + 1; }
    const objective = state.storyComplete && !navigating ? "Story complete · explore my work" : navigationCategory && state.selectionReady ? `Head to the ${navigationCategory === "uiux" ? "UI/UX laptop" : "Industrial Design table"}` : quest.objective;
    document.getElementById("quest-number").textContent = `Quest ${state.questIndex + 1} of 6${state.completed.length === 6 ? " · complete" : ""}`;
    document.getElementById("quest-title").textContent = objective.toUpperCase();
    document.getElementById("quest-objective").textContent = objective;
    document.getElementById("quest-compact").textContent = objective;
    document.getElementById("quest-location").textContent = navigationCategory && state.selectionReady ? "Both workstations are in the right room. You can switch anytime." : quest.location;
    document.getElementById("story-progress").value = state.completed.length;
    document.getElementById("progress-label").textContent = `Progress: ${state.progress}%`;
    document.getElementById("story-clock").textContent = state.time;
    document.getElementById("inventory").hidden = !state.completed.includes("football");
    document.getElementById("choose-adventure").hidden = !state.selectionReady;
    document.getElementById("compact-progress").textContent = `${state.progress}%`;
    document.getElementById("completed-objectives").textContent = state.completed.map(id => config.story.quests.find(q => q.id === id).objective).join(" · ") || "No objectives completed yet.";
    for (const button of document.querySelectorAll("[data-category]")) button.setAttribute("aria-pressed", String(button.dataset.category === navigationCategory));
  }

  function renderPanels() {
    const state = machine.getState();
    const showChoices = state.selectionReady && choicesOpen && accessible.hidden;
    choices.hidden = !showChoices;
    const stop = accessible.hidden && !showChoices && !state.pending && !introducing ? nearby : undefined;
    showProximityInfo(stop);
    actionButton.hidden = true;
    const instruction = document.getElementById("interaction-note");
    instruction.textContent = "";
    if (!stop || stop.link) return;
    const expected = config.story.quests[state.questIndex].id;
    if (stop.id === expected && state.completed.length < 5) {
      actionButton.hidden = false;
      actionButton.textContent = `${config.story.quests[state.questIndex].action} · E / tap`;
    } else if (state.completed.includes(stop.id)) {
      actionButton.hidden = false;
      actionButton.textContent = `Revisit ${stop.label || stop.title} · E / tap`;
    } else if (config.story.quests.some(quest => quest.id === stop.id)) {
      instruction.textContent = `Up next: ${config.story.quests[state.questIndex].objective}. Feel free to look around.`;
    }
  }

  function showTimeTransition() {
    clearTimeout(transitionTimer);
    const transition = document.getElementById("time-transition");
    transition.dataset.active = "true";
    transitionTimer = setTimeout(() => { transition.dataset.active = "false"; }, 2000);
  }

  function interact() {
    if (!nearby || !accessible.hidden || !choices.hidden) return;
    if (nearby.link) {
      const visited = machine.dispatch({ type: "visit", category: nearby.id });
      if (visited.completedNow) sound.complete();
      navigating = false;
      refreshQuest();
      window.open(nearby.link, "_blank", "noopener,noreferrer");
      return;
    }
    if (queue.isBusy() || machine.getState().pending) return;
    const result = machine.dispatch({ type: "interact", id: nearby.id });
    if (!result.changed) {
      if (result.state.completed.includes(nearby.id)) queue.enqueue(config.story[nearby.id] || [nearby.text]);
      return;
    }
    sound.checkpoint();
    if (!reducedMotion.matches) tracker.animate?.([{ borderColor: "#72d8ce" }, { borderColor: "#bb7c8066" }], { duration: 600 });
    if (nearby.id === "football") {
      pickupUntil = k.time() + 0.45;
      if (reducedMotion.matches) football.hidden = true;
    }
    if (nearby.id === "tv") glowUntil = k.time() + 0.9;
    const id = nearby.id;
    const texts = config.story[id];
    const messages = texts.map((text, index) => ({
      text,
      onStart: id === "cycling" && index === 1 ? showTimeTransition : undefined,
      onEnd: index === texts.length - 1 ? () => {
        machine.dispatch({ type: "dialogue-finished", id });
        if (id === "degree") choicesOpen = true;
        refreshQuest(); renderPanels();
      } : undefined,
    }));
    queue.enqueue(messages);
    refreshQuest();
    renderPanels();
  }
  actionButton.addEventListener("click", () => { interact(); document.getElementById("game").focus({ preventScroll: true }); });
  k.onKeyPress("e", interact);
  document.getElementById("portfolio-link").addEventListener("click", event => {
    const result = machine.dispatch({ type: "visit", category: nearby?.id });
    if (result.completedNow) sound.complete();
    navigating = false;
    refreshQuest();
    if (event.detail > 0) document.getElementById("game").focus({ preventScroll: true });
  });

  for (const button of document.querySelectorAll("[data-category]")) {
    button.addEventListener("click", () => {
      const result = machine.dispatch({ type: "choose", category: button.dataset.category });
      if (!result.state.selectionReady) return;
      navigationCategory = button.dataset.category;
      navigating = true;
      choicesOpen = false;

      refreshQuest();
      renderPanels();
      queue.enqueue([`Let's explore ${navigationCategory === "uiux" ? "UI/UX Design" : "Industrial Design"}. Follow the hint to the workstation, then open the portfolio when you're ready.`]);
      document.getElementById("game").focus({ preventScroll: true });
    });
  }
  document.getElementById("choose-adventure").addEventListener("click", event => {
    choicesOpen = !choicesOpen;
    renderPanels();
    if (event.detail > 0) document.getElementById("game").focus({ preventScroll: true });
  });
  document.getElementById("close-choices").addEventListener("click", () => {
    choicesOpen = false;
    renderPanels();
    document.getElementById("game").focus({ preventScroll: true });
  });
  function setCollapsed() {
    tracker.dataset.collapsed = String(collapsed);
    document.getElementById("quest-body").hidden = collapsed;
    document.getElementById("quest-compact").hidden = !collapsed;
    document.getElementById("collapse-quest").setAttribute("aria-expanded", String(!collapsed));
    document.getElementById("collapse-quest").textContent = collapsed ? "+" : "−";
    document.getElementById("collapse-quest").setAttribute("aria-label", collapsed ? "Expand quest tracker" : "Collapse quest tracker");
  }
  try { collapsed = storage?.getItem("a-day-tracker-collapsed") === "yes"; } catch { /* Optional preference. */ }
  setCollapsed();
  document.getElementById("collapse-quest").addEventListener("click", event => {
    collapsed = !collapsed;
    setCollapsed();
    try { storage?.setItem("a-day-tracker-collapsed", collapsed ? "yes" : "no"); } catch { /* Optional preference. */ }
    if (event.detail > 0) document.getElementById("game").focus({ preventScroll: true });
  });
  document.getElementById("restart-story").addEventListener("click", () => {
    machine.dispatch({ type: "restart" });
    navigationCategory = null;
    navigating = true;
    choicesOpen = false;
    pickupUntil = glowUntil = 0;
    football.pos = k.vec2(147, 129);
    football.opacity = 1;
    football.scale = k.vec2(1);
    football.hidden = false;
    clearTimeout(transitionTimer);
    document.getElementById("time-transition").dataset.active = "false";
    queue.clear();
    refreshQuest();
    renderPanels();
    introduce(config.story.opening);
    document.getElementById("game").focus({ preventScroll: true });
  });

  k.onUpdate(() => {
    if (guide.dataset.dismissed !== "true" && player.pos.dist(startPosition) > 40) guide.dataset.dismissed = "true";
    const state = machine.getState();
    const distance = object => player.pos.dist(k.vec2(object.x * scaleFactor, object.y * scaleFactor));
    const available = objects.filter(object => (object.id === goal?.id || state.completed.includes(object.id) || (state.selectionReady && object.link) || (!object.label && object.id !== "intro")) && !(object.id === "football" && state.completed.includes("football")));
    const candidate = available.map(object => ({ object, distance: distance(object) })).filter(item => item.distance < 24 * scaleFactor).sort((a, b) => a.distance - b.distance)[0];
    let current = nearby && available.includes(nearby) && distance(nearby) < 28 * scaleFactor ? nearby : undefined;
    if (candidate && (!current || candidate.distance + 4 * scaleFactor < distance(current))) current = candidate.object;
    // Adjacent couch/TV zones must not hide the next objective behind a revisit prompt.
    if (state.completed.length < 5 && goal && distance(goal) < 24 * scaleFactor) current = goal;
    if (current?.id !== nearby?.id) { nearby = current; renderPanels(); }
    if (pickupUntil) {
      const fraction = Math.max(0, (pickupUntil - k.time()) / 0.45);
      football.pos.y = 129 - (1 - fraction) * 8;
      football.opacity = fraction;
      if (fraction === 0) { football.hidden = true; pickupUntil = 0; }
    }
    tvGlow.opacity = glowUntil > k.time() ? reducedMotion.matches ? 0.3 : 0.3 + Math.sin(k.time() * 18) * 0.15 : 0;
    for (const { object, marker } of markers) {
      marker.hidden = object.id !== goal?.id;
      const targeted = object.id === goal?.id;
      marker.color = k.Color.fromHex(targeted ? "#72d8ce" : "#ffce88");
      marker.opacity = reducedMotion.matches ? 0.8 : k.time() < attentionUntil ? 1 : 0.7 + Math.sin(k.time() * 3) * 0.15;
    }
    arrow.hidden = true;
    if (goal) {
      const local = player.pos.scale(1 / scaleFactor);
      const waypoint = navigate(local, goal);
      let destination = k.vec2(waypoint.x, waypoint.y);
      const delta = destination.sub(local);
      arrow.pos = local.add(delta.scale(14 / Math.max(1, Math.hypot(delta.x, delta.y))));
      arrow.angle = Math.atan2(delta.y, delta.x) * 180 / Math.PI;
    }
  });
  // Draw runs after Kaboom updates its camera transform, so overlays follow without lag.
  k.onDraw(() => {
    const viewport = { width: innerWidth, height: innerHeight };
    const controls = document.getElementById("global-controls").getBoundingClientRect();
    const trackerBox = tracker.getBoundingClientRect();
    let objectBounds = [];
    if (nearby?.label) {
      // Leave room for the nearby prop itself, not only its floating name.
      const dimensions = {
        football: [147, 129, 12, 12], cycling: [185, 108, 26, 20],
        couch: [96, 96, 32, 32], tv: [tv.x, tv.y, 16, 24],
        degree: [nearby.x - 8, nearby.y - 16, 16, 16],
        uiux: [workstationLayout.laptop.x, workstationLayout.laptop.y, 22, 14],
        industrial: [table.x, table.y, table.width, table.height],
      }[nearby.id];
      if (dimensions) {
        const [x, y, width, height] = dimensions;
        const a = k.toScreen(k.vec2(x * scaleFactor, y * scaleFactor));
        const b = k.toScreen(k.vec2((x + width) * scaleFactor, (y + height) * scaleFactor));
        objectBounds = [{ left: a.x - 4, top: a.y - 4, right: b.x + 4, bottom: b.y + 4 }];
      }
    }
    queue.position(k.toScreen(player.pos), viewport, [trackerBox, controls], objectBounds);
    const exclusions = [trackerBox, controls];
    if (queue.isActive()) exclusions.push(document.getElementById("thought-bubble").getBoundingClientRect());
    if (!choices.hidden) exclusions.push(choices.getBoundingClientRect());
    if (document.getElementById("textbox-container").dataset.active === "true") exclusions.push(document.getElementById("textbox-container").getBoundingClientRect());
    const goalScreen = goal && k.toScreen(k.vec2(goal.x * scaleFactor, goal.y * scaleFactor));
    const visible = goalScreen && goalScreen.x > 24 && goalScreen.x < innerWidth - 24 && goalScreen.y > 24 && goalScreen.y < innerHeight - 24;
    const indicator = document.getElementById("direction-indicator");
    indicator.hidden = !goal || nearby?.id === goal.id || visible || !accessible.hidden;
    if (!indicator.hidden) {
      const playerScreen = k.toScreen(player.pos);
      const route = k.toScreen(arrow.pos.scale(scaleFactor));
      const angle = Math.atan2(route.y - playerScreen.y, route.x - playerScreen.x);
      const x = Math.max(24, Math.min(innerWidth - 24, playerScreen.x + Math.cos(angle) * 90));
      let y = Math.max(24, Math.min(innerHeight - 24, playerScreen.y + Math.sin(angle) * 90));
      for (const box of exclusions) if (x + 18 > box.left && x - 18 < box.right && y + 18 > box.top && y - 18 < box.bottom) y = Math.min(innerHeight - 24, box.bottom + 24);
      indicator.style.left = x + "px"; indicator.style.top = y + "px"; indicator.style.setProperty("--direction", angle + "rad");
    }
    updateLabels({
      activeId: accessible.hidden && nearby?.id === goal?.id ? goal?.id : undefined,
      toScreen: (x, y) => k.toScreen(k.vec2(x * scaleFactor, y * scaleFactor)),
      viewport,
      exclusions,
    });
  });
  refreshQuest();
  renderPanels();
  const restored = machine.getState();
  function introduce(texts) {
    introducing = true;
    refreshQuest(); renderPanels();
    queue.enqueue(texts.map((text, index) => ({ text, onEnd: index === texts.length - 1 ? () => {
      introducing = false; refreshQuest(); renderPanels();
    } : undefined })));
  }
  introduce(restored.completed.length === 0 ? config.story.opening : [restored.storyComplete ? "Welcome back! Choose or switch your design adventure whenever you're ready." : `Welcome back! Next up: ${config.story.quests[restored.questIndex].objective}.`]);
  return { machine, queue, objects, cameraAttention() {
    // A restrained one-second glance preserves the player in view. Holding the
    // mouse keeps the normal camera, so pointer movement never changes direction.
    if (!goal || reducedMotion.matches || k.isMouseDown("left")) return k.vec2(0);
    const remaining = attentionUntil - k.time();
    if (remaining <= 0 || remaining > 1) return k.vec2(0);
    const delta = k.vec2(goal.x * scaleFactor, goal.y * scaleFactor).sub(player.pos);
    const weight = Math.sin((1 - remaining) * Math.PI) * 0.18;
    return delta.scale(Math.min(1, 100 / Math.max(1, delta.len())) * weight);
  } };
}
