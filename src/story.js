import { portfolioConfig as config } from "./portfolioConfig";
import { scaleFactor } from "./constants";
import { showProximityInfo } from "./utils";
import { setupDiscoveryAudio } from "./discoveryAudio";
import { createQuestMachine } from "./questState";
import { createDialogueQueue } from "./dialogueQueue";
import { createFloatingLabels } from "./floatingLabels";
import { getWorldObjects, workstationLayout } from "./worldObjects";
import { createNavigator, routeCorners } from "./navigation";
import { placeEdgeArrow } from "./questGuidance";
import { createCutscenes } from "./cutscenes";

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
  const help = document.getElementById("help-panel");
  function closeHelp() {
    help.hidden = true;
    document.getElementById("help-toggle").setAttribute("aria-expanded", "false");
    try { sessionStorage.setItem("vishnu-controls-seen", "yes"); } catch { /* Optional session preference. */ }
    document.getElementById("game").focus({ preventScroll: true });
  }
  function openHelp() {
    help.hidden = false;
    document.getElementById("help-toggle").setAttribute("aria-expanded", "true");
    document.getElementById("start-exploring").focus({ preventScroll: true });
  }
  document.getElementById("help-toggle").addEventListener("click", () => help.hidden ? openHelp() : closeHelp());
  document.getElementById("start-exploring").addEventListener("click", closeHelp);
  document.getElementById("dismiss-help").addEventListener("click", closeHelp);
  document.getElementById("advance-thought").addEventListener("click", () => { queue.advance(); document.getElementById("game").focus({ preventScroll: true }); });

  const freshStory=machine.getState().completed.length===0&&!machine.getState().pending&&machine.getState().thoughtsSeen.length===0;
  try { if (freshStory&&sessionStorage.getItem("vishnu-controls-seen") !== "yes") openHelp(); } catch { if(freshStory)openHelp(); }
  const cutscenes = createCutscenes(k);
  const certificate = document.getElementById("certificate-modal");
  const restartConfirm = document.getElementById("restart-confirm");
  let autoWalk, certificateDone, previousPhase, restartFromCompletion=false;
  const completion=document.getElementById("journey-complete");
  const reopen=document.createElement("button");reopen.id="reopen-completion";reopen.textContent="Journey complete / portfolio";
  document.getElementById("restart-story").before(reopen);
  let nearby;
  let navigationCategory = machine.getState().selectedCategory;
  let navigating = !machine.getState().storyComplete;
  let choicesOpen = machine.getState().selectionReady && !navigationCategory;
  let pickupUntil = 0;
  let glowUntil = 0;
  let transitionTimer;
  let goal;
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
    if (!help.hidden) closeHelp();
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
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (restartConfirm.open) { closeRestart(); return; }
    if (certificate.open) { dismissCertificate(); return; }
    if (cutscenes.isActive()) { cutscenes.finish(); return; }
    if (!help.hidden) { closeHelp(); return; }
    if (!accessible.hidden) { closeAccessible(); return; }
    if (!choices.hidden) { choicesOpen=false; renderPanels(); document.getElementById("game").focus(); return; }
    if(!completion.hidden){resumeGame();return;}
    if(machine.getState().storyComplete){showCompletion();return;}
    openRestart();
  });


  const football = map.add([k.sprite("football"), k.pos(147, 129), k.opacity(1), k.scale(1), "story-football"]);
  football.hidden = machine.getState().completed.includes("football");
  map.add([k.sprite("bicycle"), k.pos(185, 108)]);
  map.add([k.sprite("laptop"), k.pos(workstationLayout.laptop.x, workstationLayout.laptop.y)]);
  const table = workstationLayout.prototype;
  const navigate = createNavigator(mapData.layers.find(layer => layer.name === "boundaries").objects, table);
  const initial=machine.getState();
  if(initial.position){
    let safe=initial.position;
    if(!navigate.clear(safe.x,safe.y)){
      const points=[];for(let x=56;x<=328;x+=4)for(let y=72;y<=164;y+=4)if(navigate.clear(x,y))points.push({x,y});
      safe=points.sort((a,b)=>Math.hypot(a.x-initial.position.x,a.y-initial.position.y)-Math.hypot(b.x-initial.position.x,b.y-initial.position.y))[0];
    }
    if(safe)player.pos=k.vec2(safe.x*scaleFactor,safe.y*scaleFactor);
  }else if(initial.storyComplete){const approach=initial.selectedCategory==="uiux"?{x:238,y:104}:{x:316,y:152};player.pos=k.vec2(approach.x*scaleFactor,approach.y*scaleFactor);}
  let lastSaved=player.pos.clone(),saveElapsed=0;
  function savePosition(extra={}) {machine.dispatch({type:"snapshot",position:{x:player.pos.x/scaleFactor,y:player.pos.y/scaleFactor},...extra});lastSaved=player.pos.clone();}
  window.addEventListener("pagehide",()=>savePosition());
  map.add([k.sprite("prototype"), k.pos(table.x, table.y)]);
  map.add([k.pos(table.x, table.y + table.solidY), k.area({ shape: new k.Rect(k.vec2(0), table.width, table.solidHeight) }), k.body({ isStatic: true }), "prototype-table"]);
  const tv = mapData.layers.find(layer => layer.name === "boundaries").objects.find(object => object.name === "tv");
  const tvGlow = map.add([k.pos(tv.x + 3, tv.y + 4), k.rect(8, 6), k.color(k.Color.fromHex("#72d8ce")), k.opacity(0), k.z(2)]);

  const arrow = map.add([k.text("›", { size: 8, font: "Bungee" }), k.pos(), k.anchor("center"), k.rotate(), k.color(k.Color.fromHex("#72d8ce")), k.opacity(0.6), k.z(10)]);

  let attentionUntil = 0;
  let attentionId;
  function refreshQuest() {
    const state = machine.getState();
    const quest = config.story.quests[state.questIndex];
    goal = state.completed.length < 5 ? byId(quest.id) : navigationCategory ? byId(navigationCategory) : undefined;
    if (state.pending || (state.selectionReady && !navigating)) goal = undefined;
    if (goal?.id !== attentionId) { attentionId = goal?.id; attentionUntil = k.time() + 1; }
    const objective = state.storyComplete && !navigating ? "Story complete · explore my work" : navigationCategory && state.selectionReady && navigating ? `Head to the ${navigationCategory === "uiux" ? "UI/UX laptop" : "Industrial Design table"}` : quest.objective;
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
    document.getElementById("restart-story").hidden = !state.storyComplete;
    reopen.hidden=!state.storyComplete;
    document.getElementById("compact-progress").textContent = `${state.progress}%`;
    document.getElementById("completed-objectives").textContent = state.completed.map(id => config.story.quests.find(q => q.id === id).objective).join(" · ") || "No objectives completed yet.";
    for (const button of document.querySelectorAll("[data-category]")) button.setAttribute("aria-pressed", String(button.dataset.category === navigationCategory));
  }

  function renderPanels() {
    const state = machine.getState();
    const showChoices = state.selectionReady && choicesOpen && accessible.hidden;
    choices.hidden = !showChoices;
    const stop = accessible.hidden && !showChoices && !state.pending && !autoWalk && completion.hidden ? nearby : undefined;
    showProximityInfo(stop);
    if(stop?.link&&!state.storyComplete){document.getElementById("portfolio-link").hidden=true;document.getElementById("portfolio-hint").textContent="Choose a design category to walk to its workstation.";}
    else document.getElementById("portfolio-hint").textContent="Click the portfolio link to open it in a new tab.";
    actionButton.hidden = true;
    const instruction = document.getElementById("interaction-note");
    instruction.textContent = "";
    if (!stop || stop.link) return;
    const expected = config.story.quests[state.questIndex].id;
    if (stop.id === expected && state.completed.length < 5) {
      actionButton.hidden = false;
      actionButton.textContent = `${config.story.quests[state.questIndex].action} · SPACE — INTERACT / tap`;
    } else if (state.completed.includes(stop.id)) {
      actionButton.hidden = false;
      actionButton.textContent = `Revisit ${stop.label || stop.title} · SPACE — INTERACT / tap`;
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
    if (!nearby || !accessible.hidden || !choices.hidden || player.isInDialogue || autoWalk) return;
    if (nearby.link) { if(machine.getState().storyComplete)showCompletion(nearby.id);else startWalk(nearby.id);return; }
    if (queue.isBusy() || machine.getState().pending) return;
    const result = machine.dispatch({ type: "interact", id: nearby.id });
    if (!result.changed) {
      if (result.state.completed.includes(nearby.id)) queue.enqueue(config.story[nearby.id] || [nearby.text]);
      return;
    }
    savePosition();
    sound.checkpoint();
    if (!reducedMotion.matches) tracker.animate?.([{ borderColor: "#72d8ce" }, { borderColor: "#bb7c8066" }], { duration: 600 });
    if (nearby.id === "football") {
      pickupUntil = k.time() + 0.45;
      if (reducedMotion.matches) football.hidden = true;
    }
    if (nearby.id === "tv") glowUntil = k.time() + 0.9;
    const id = nearby.id;
    refreshQuest(); renderPanels();
    if(id === "cycling" || id === "couch") {
      machine.dispatch({type:"presentation",phase:"CUTSCENE"}); player.isInDialogue=true;
      document.body.dataset.cinematic="true";
      cutscenes.play(id,()=>{document.body.dataset.cinematic="false";machine.dispatch({type:"presentation",phase:null});player.isInDialogue=false;finishObjective(id);});
    } else if(id === "degree") {
      machine.dispatch({type:"presentation",phase:"CERTIFICATE"});player.isInDialogue=true;
      certificateDone=()=>finishObjective(id);
      certificate.showModal();document.getElementById("close-certificate").focus();
    } else finishObjective(id);
  }
  function finishObjective(id) {
    const complete=()=>{
      machine.dispatch({type:"dialogue-finished",id});
      savePosition();
      if(machine.getState().selectionReady){choicesOpen=true;refreshQuest();renderPanels();}
      else introduce(config.story.begins[config.story.quests[machine.getState().questIndex].id] || []);
    };
    const texts=config.story[id];
    if(!texts.length){complete();return;}
    queue.enqueue(texts.map((text,index)=>({text,onEnd:index===texts.length-1?complete:undefined})));
  }

  actionButton.addEventListener("click", () => { interact(); document.getElementById("game").focus({ preventScroll: true }); });
  function showCompletion(category=navigationCategory) {
    if(autoWalk||!machine.getState().storyComplete)return;
    const station=byId(category);if(!station?.link)return;
    const link=document.getElementById("completion-portfolio");link.href=station.link;
    link.textContent=category==="uiux"?"EXPLORE MY UI/UX PORTFOLIO →":"EXPLORE MY INDUSTRIAL DESIGN PORTFOLIO →";
    choicesOpen=false;choices.hidden=true;completion.hidden=false;queue.clear();player.isInDialogue=true;
    savePosition({completionDismissed:false});renderPanels();link.focus({preventScroll:true});
  }
  function resumeGame() {
    completion.hidden=true;player.isInDialogue=false;savePosition({completionDismissed:true});renderPanels();document.getElementById("game").focus();
  }
  document.getElementById("resume-game").addEventListener("click",resumeGame);
  document.getElementById("completion-restart").addEventListener("click",()=>{restartFromCompletion=true;completion.hidden=true;openRestart();});
  reopen.addEventListener("click",()=>showCompletion());
  function arrive() {
    const result=machine.dispatch({type:"visit",category:navigationCategory});
    navigating=false;savePosition({walking:false});refreshQuest();
    if(result.completedNow){sound.complete();if(!reducedMotion.matches)tracker.animate?.([{borderColor:"#ffce88"},{borderColor:"#bb7c80"}],{duration:850});}
    showCompletion();
  }
  document.addEventListener("keydown", event => {
    if (event.code === "Space" && certificate.open && !event.target.closest?.("button")) { event.preventDefault(); if(!event.repeat)dismissCertificate(); return; }
    if (event.code === "Space" && cutscenes.isActive()) { event.preventDefault(); if(!event.repeat)cutscenes.finish(); return; }
    if (restartConfirm.open || autoWalk || !completion.hidden) return;
    if (event.code !== "Space" || event.target.closest?.("input, textarea, select, button, a, summary, [contenteditable='true'], [role='button']")) return;
    if (!help.hidden || !accessible.hidden || !choices.hidden) return;
    event.preventDefault();
    if (event.repeat) return;
    if (queue.isBusy()) { queue.advance(); return; }
    interact();
  });
  // Native links are the only portfolio navigation mechanism.
  function startWalk(category,restoring=false) {
    if(autoWalk)return;
    if(!machine.dispatch({type:"choose",category}).state.selectionReady)return;
    navigationCategory=category;navigating=true;choicesOpen=false;completion.hidden=true;
    queue.clear();refreshQuest();renderPanels();savePosition({walking:true});
    const target=category==="uiux"?{x:238,y:104}:{x:316,y:152};
    const route=navigate.path(player.pos.scale(1/scaleFactor),target,3);
    if(!route){failWalk();return;}
    autoWalk={route:routeCorners(route),speed:player.speed*3,index:0,stalled:0,elapsed:0,last:player.pos.clone()};
    machine.dispatch({type:"presentation",phase:"AUTO_WALK"});player.isInDialogue=true;
    document.getElementById("auto-portfolio-fallback").hidden=true;
    document.getElementById("auto-walk-status").textContent="Walking to your workstation…";
    document.getElementById("auto-walk-feedback").hidden=false;
    if(!restoring)document.getElementById("game").focus({preventScroll:true});
  }
  for(const button of document.querySelectorAll("[data-category]"))button.addEventListener("click",()=>startWalk(button.dataset.category));
  function failWalk() {
    autoWalk=undefined;player.isInDialogue=false;player.play("idle-side");
    machine.dispatch({type:"presentation",phase:null});savePosition({walking:false});
    const fallback=document.getElementById("auto-portfolio-fallback");fallback.href=byId(navigationCategory).link;fallback.hidden=false;
    document.getElementById("auto-walk-feedback").hidden=false;
    document.getElementById("auto-walk-status").textContent="The walk could not finish. Choose again to retry, or open the portfolio below.";
  }
  document.getElementById("choose-adventure").addEventListener("click", event => {
    if(autoWalk)return;
    if(!completion.hidden)resumeGame();
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
  function restartDay() {
    restartConfirm.close();certificate.close();completion.hidden=true;certificateDone=undefined;restartFromCompletion=false;
    cutscenes.clear();autoWalk=undefined;
    document.body.dataset.cinematic="false";
    player.isInDialogue=false;player.pos=startPosition.clone();player.flipX=false;player.direction="down";player.play("idle-down");
    nearby=undefined;accessible.hidden=true;help.hidden=true;
    document.getElementById("quick-access").setAttribute("aria-expanded","false");
    document.getElementById("help-toggle").setAttribute("aria-expanded","false");
    document.getElementById("auto-walk-feedback").hidden=true;
    machine.dispatch({ type: "restart" });
    navigationCategory = null;
    navigating = true;
    choicesOpen = false;
    document.getElementById("portfolio-status").textContent = "";
    document.getElementById("accessible-feedback").textContent = "";
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

  }
  function openRestart() {
    if(restartConfirm.open)return;
    if(!completion.hidden){restartFromCompletion=true;completion.hidden=true;}
    previousPhase=machine.getState().phase;
    machine.dispatch({type:"presentation",phase:"RESTART_CONFIRMATION"});
    queue.pause();player.isInDialogue=true;restartConfirm.showModal();
    document.getElementById("no-restart").focus();
  }
  function closeRestart() {
    restartConfirm.close();machine.dispatch({type:"presentation",phase:previousPhase==="QUEST_ACTIVE"||previousPhase==="COMPLETION_DIALOGUE"||previousPhase==="PORTFOLIO_SELECTION"||previousPhase==="STORY_COMPLETE"?null:previousPhase});
    player.isInDialogue=Boolean(autoWalk);queue.resume();document.getElementById("game").focus();
    if(restartFromCompletion){restartFromCompletion=false;showCompletion();}
  }
  function dismissCertificate() {
    if(!certificate.open)return;certificate.close();machine.dispatch({type:"presentation",phase:null});
    player.isInDialogue=false;const done=certificateDone;certificateDone=undefined;done?.();document.getElementById("game").focus();
  }
  document.getElementById("close-certificate").addEventListener("click",dismissCertificate);
  certificate.addEventListener("cancel",event=>{event.preventDefault();dismissCertificate();});
  restartConfirm.addEventListener("cancel",event=>{event.preventDefault();closeRestart();});
  document.getElementById("yes-restart").addEventListener("click",()=>{if(restartConfirm.open)restartDay();});
  document.getElementById("no-restart").addEventListener("click",closeRestart);
  document.getElementById("restart-story").addEventListener("click",openRestart);

  k.onUpdate(() => {
    cutscenes.update(restartConfirm.open);
    saveElapsed+=k.dt();if(saveElapsed>=.8){saveElapsed=0;if(player.pos.dist(lastSaved)>4)savePosition();}
    if(restartConfirm.open)return;
    if(autoWalk){
      autoWalk.elapsed+=k.dt();
      if(autoWalk.elapsed>12){failWalk();return;}
      let next=autoWalk.route[autoWalk.index];
      let target=k.vec2(next.x*scaleFactor,next.y*scaleFactor);
      while(player.pos.dist(target)<2){
        autoWalk.index++;
        if(autoWalk.index>=autoWalk.route.length){autoWalk=undefined;machine.dispatch({type:"presentation",phase:null});player.isInDialogue=false;player.play("idle-side");document.getElementById("auto-walk-feedback").hidden=true;arrive();return;}
        next=autoWalk.route[autoWalk.index];target=k.vec2(next.x*scaleFactor,next.y*scaleFactor);
      }
      {
        const delta=target.sub(player.pos);const horizontal=Math.abs(delta.x)>Math.abs(delta.y);
        const anim=horizontal?"walk-side":delta.y<0?"walk-up":"walk-down";
        if(player.curAnim()!==anim)player.play(anim);if(horizontal)player.flipX=delta.x<0;
        player.moveTo(target,autoWalk.speed);
        autoWalk.stalled=player.pos.dist(autoWalk.last)<.2?autoWalk.stalled+k.dt():0;autoWalk.last=player.pos.clone();
        if(autoWalk.stalled>1.2){failWalk();return;}
      }
    }
    if (guide.dataset.dismissed !== "true" && player.pos.dist(startPosition) > 40) guide.dataset.dismissed = "true";
    const state = machine.getState();
    const distance = object => player.pos.dist(k.vec2(object.x * scaleFactor, object.y * scaleFactor));
    const available = objects.filter(object => (object.id === goal?.id || state.completed.includes(object.id) || (state.selectionReady && object.link) || (!object.label && object.id !== "intro")) && !(object.id === "football" && state.completed.includes("football")));
    const candidate = available.map(object => ({ object, distance: distance(object) })).filter(item => item.distance < (item.object.link ? 30 : 26) * scaleFactor).sort((a, b) => a.distance - b.distance)[0];
    let current = nearby && available.includes(nearby) && distance(nearby) < 28 * scaleFactor ? nearby : undefined;
    if (candidate && (!current || candidate.distance + 4 * scaleFactor < distance(current))) current = candidate.object;
    // Adjacent couch/TV zones must not hide the next objective behind a revisit prompt.
    if (state.completed.length < 5 && goal && distance(goal) < 26 * scaleFactor) current = goal;
    if (current?.id !== nearby?.id) { nearby = current; renderPanels(); }
    if (pickupUntil) {
      const fraction = Math.max(0, (pickupUntil - k.time()) / 0.45);
      football.pos.y = 129 - (1 - fraction) * 8;
      football.opacity = fraction;
      if (fraction === 0) { football.hidden = true; pickupUntil = 0; }
    }
    tvGlow.opacity = glowUntil > k.time() ? reducedMotion.matches ? 0.3 : 0.3 + Math.sin(k.time() * 18) * 0.15 : state.completed.includes("tv") ? 0.2 : 0;
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
    const blocked = [trackerBox, controls];
    if (!help.hidden) blocked.push(help.getBoundingClientRect());
    if (!accessible.hidden) blocked.push(accessible.getBoundingClientRect());
    if (goal) {
      const pinPoint = k.toScreen(k.vec2(goal.x * scaleFactor, (goal.labelY ?? goal.y - 18) * scaleFactor));
      const labelHeight=document.querySelector(`.floating-label[data-object="${goal.id}"]`)?.offsetHeight || 28;
      objectBounds.push({ left: pinPoint.x - 110, right: pinPoint.x + 110, top: pinPoint.y - labelHeight - 63, bottom: pinPoint.y });
    }
    queue.position(k.toScreen(player.pos), viewport, blocked, objectBounds);
    const exclusions = [...blocked];
    if(!completion.hidden)exclusions.push(completion.getBoundingClientRect());
    if (queue.isActive()) exclusions.push(document.getElementById("thought-bubble").getBoundingClientRect());
    if (!choices.hidden) exclusions.push(choices.getBoundingClientRect());
    if (document.getElementById("textbox-container").dataset.active === "true") exclusions.push(document.getElementById("textbox-container").getBoundingClientRect());
    const goalScreen = goal && k.toScreen(k.vec2(goal.x * scaleFactor, goal.y * scaleFactor));
    const visible = goalScreen && goalScreen.x > 24 && goalScreen.x < innerWidth - 24 && goalScreen.y > 24 && goalScreen.y < innerHeight - 24;
    const indicator = document.getElementById("direction-indicator");
    indicator.hidden = !goal || nearby?.id === goal.id || visible || !accessible.hidden || restartConfirm.open;
    if (!indicator.hidden) {
      const playerScreen = k.toScreen(player.pos);
      const route = k.toScreen(arrow.pos.scale(scaleFactor));
      const angle = Math.atan2(route.y - playerScreen.y, route.x - playerScreen.x);
      const position = placeEdgeArrow(angle, viewport, exclusions, 64);
      indicator.hidden = !position;
      if (position) {
        indicator.style.left = position.x + "px"; indicator.style.top = position.y + "px";
        indicator.style.setProperty("--direction", angle + "rad");
      }
    }
    const pin = document.getElementById("quest-pin");
    pin.hidden = !goal || !visible || !accessible.hidden || !help.hidden || restartConfirm.open;
    if (!pin.hidden) {
      const point = k.toScreen(k.vec2(goal.x * scaleFactor, (goal.labelY ?? goal.y - 18) * scaleFactor));
      const labelHeight=document.querySelector(`.floating-label[data-object="${goal.id}"]`)?.offsetHeight || 28;
      const top = point.y - labelHeight - 63;
      const box = { left: point.x - 22, right: point.x + 22, top:top-4, bottom: top + 55 };
      pin.hidden = top < 8 || exclusions.some(b => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top);
      pin.style.left = point.x + "px"; pin.style.top = top + "px";
      if (!pin.hidden) exclusions.push(box);
      pin.dataset.object = goal.id;
    }
    updateLabels({
      activeId: goal?.id,
      visibleIds: machine.getState().selectionReady ? ["uiux", "industrial"] : [],
      selectedId: machine.getState().selectionReady ? navigationCategory : undefined,
      toScreen: (x, y) => k.toScreen(k.vec2(x * scaleFactor, y * scaleFactor)),
      viewport,
      exclusions,
    });
  });
  refreshQuest();
  renderPanels();
  function introduce(texts) {
    queue.clear();
    refreshQuest(); renderPanels();
    const id=config.story.quests[machine.getState().questIndex].id;
    if(!machine.getState().thoughtsSeen.includes(id)){queue.enqueue(texts);savePosition({thought:id});}
  }
  if(initial.pending){
    const id=initial.pending;
    if(id==="cycling"||id==="couch"){
      machine.dispatch({type:"presentation",phase:"CUTSCENE"});player.isInDialogue=true;document.body.dataset.cinematic="true";
      cutscenes.play(id,()=>{document.body.dataset.cinematic="false";machine.dispatch({type:"presentation",phase:null});player.isInDialogue=false;finishObjective(id);});
    }else if(id==="degree"){
      machine.dispatch({type:"presentation",phase:"CERTIFICATE"});player.isInDialogue=true;certificateDone=()=>finishObjective(id);certificate.showModal();
    }else {if(id==="football")football.hidden=true;finishObjective(id);}
  }else if(initial.walking&&navigationCategory)startWalk(navigationCategory,true);
  else if(initial.storyComplete){if(!initial.completionDismissed)showCompletion();}
  else if(initial.selectionReady){choicesOpen=true;renderPanels();}
  else introduce(initial.completed.length?config.story.begins[config.story.quests[initial.questIndex].id]||[]:config.story.opening);
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
