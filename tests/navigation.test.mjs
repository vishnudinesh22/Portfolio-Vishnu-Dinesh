import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createNavigator, routeCorners } from "../src/navigation.js";
test("guidance routes around the couch and reaches the right-wall table approach", () => {
  const boundaries = JSON.parse(readFileSync(new URL("../public/map.json", import.meta.url))).layers.find(l => l.name === "boundaries").objects;
  const table = { x: 301, y: 126, width: 32, solidY: 12, solidHeight: 8 };
  const navigate = createNavigator(boundaries, table);
  const first = navigate({ x: 112, y: 128 }, { x: 120, y: 79 });
  assert.ok(first.x > 112, "Go around the couch rather than through it");
  let position = { x: 215, y: 130 };
  for (let i = 0; i < 50 && Math.hypot(position.x - 317, position.y - 143) >= 21; i++) position = navigate(position, { x: 317, y: 143 });
  assert.ok(Math.hypot(position.x - 317, position.y - 143) < 21);
});

test("both automatic workstation paths stay clear of the original furniture",()=>{
  const boundaries=JSON.parse(readFileSync(new URL("../public/map.json",import.meta.url))).layers.find(l=>l.name==="boundaries").objects;
  const navigate=createNavigator(boundaries,{x:301,y:126,width:32,solidY:12,solidHeight:8});
  for(const target of [{x:238,y:104},{x:316,y:152}]) {
    const route=navigate.path({x:120,y:88},target,3);
    assert.ok(route?.length);
    assert.ok(route.every(point=>navigate.clear(point.x,point.y)));
    const last=route.at(-1);
    assert.ok(Math.hypot(last.x-target.x,last.y-target.y)<3);
    for(let i=1;i<route.length;i++)assert.equal(Math.abs(route[i].x-route[i-1].x)+Math.abs(route[i].y-route[i-1].y),4);
    const corners=routeCorners(route);
    assert.ok(corners.length<route.length/2,"Fast walking drops intermediate stops");
    for(let i=1;i<corners.length;i++){
      const from=corners[i-1],to=corners[i];
      assert.ok(from.x===to.x||from.y===to.y,"All original turns remain; no diagonal shortcut");
      const steps=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y));
      for(let n=0;n<=steps;n++)assert.ok(navigate.clear(from.x+(to.x-from.x)*n/steps,from.y+(to.y-from.y)*n/steps));
    }
  }
});
