import { test } from "node:test";
import assert from "node:assert/strict";
import { createPortfolioTransition } from "../src/portfolioTransition.js";
import { placeEdgeArrow } from "../src/questGuidance.js";
test("first completion reserves a tab, celebrates before delayed navigation, and blocks duplicates", () => {
  const events = []; let run;
  const tab = { document: { body: {} }, location: { replace: url => events.push(url) } };
  const open = createPortfolioTransition({openTab:()=>{events.push("tab");return tab;},celebrate:()=>events.push("sound"),feedback:()=>{},schedule:(fn,ms)=>{assert.equal(ms,850);run=fn;}});
  open("portfolio",true);open("duplicate",false);
  assert.deepEqual(events,["tab","sound"]);assert.equal(tab.opener,null);
  run();assert.deepEqual(events,["tab","sound","portfolio"]);
  open("revisit",false);assert.deepEqual(events,["tab","sound","portfolio","tab","revisit"]);
});
test("muted or unavailable audio still navigates; blocked popup exposes fallback", () => {
  let run;let navigated=false;
  const open=createPortfolioTransition({openTab:()=>({document:{body:{}},location:{replace:()=>navigated=true}}),celebrate:()=>{throw Error("audio unavailable");},feedback:()=>{},schedule:fn=>run=fn});
  open("url",true);run();assert.equal(navigated,true);
  let fallback="";createPortfolioTransition({openTab:()=>null,celebrate:()=>{},feedback:text=>fallback=text})("url",false);
  assert.match(fallback,/blocked/);
});
test("edge guidance stays inside the viewport and clear of HUD and dialogue", () => {
  const position=placeEdgeArrow(-Math.PI/2,{width:390,height:844},[{left:0,top:0,right:390,bottom:230}]);
  assert.ok(position.y>=250);assert.ok(position.x===28||position.x===362);
});
