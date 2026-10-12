import { addSofa, sofaTint } from "./palette";
// Scene-specific compositions reuse the actual character, bicycle, sofa and laptop.
export function createCutscenes(k) {
  let scene, elapsed=0, done, moving;
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  function clear() { scene?.destroy(); scene=undefined; done=undefined; moving=undefined; }
  function finish() { const next=done; clear(); next?.(); }
  function play(kind,onEnd) {
    clear(); elapsed=0; done=onEnd;
    scene=k.add([k.pos(k.center()),k.fixed(),k.z(40)]);
    scene.add([k.rect(440,220),k.pos(-220,-110),k.color(k.Color.fromHex("#311047")),k.outline(4,k.Color.fromHex("#bb7c80"))]);
    if(kind==="cycling") {
      scene.add([k.rect(424,144),k.pos(-212,-102),k.color(k.Color.fromHex("#91a5a0"))]);
      scene.add([k.rect(424,62),k.pos(-212,42),k.color(k.Color.fromHex("#637b79"))]);
      for(const x of [-180,-70,110]) {
        scene.add([k.rect(8,54),k.pos(x,-18),k.color(k.Color.fromHex("#b25c34"))]);
        scene.add([k.rect(46,38),k.pos(x-19,-45),k.color(k.Color.fromHex("#566467"))]);
      }
      moving=scene.add([k.pos(-160,22)]);
      moving.add([k.sprite("bicycle"),k.pos(-39,0),k.scale(3)]);
      moving.add([k.sprite("spritesheet",{frame:975}),k.pos(-20,-34),k.scale(3),k.z(2)]);
    } else {
      scene.add([k.rect(424,206),k.pos(-212,-102),k.color(k.Color.fromHex("#91a5a0"))]);
      addSofa(k,scene,-112,-28,4);
      scene.add([k.sprite("spritesheet",{frame:936}),k.pos(-78,-12),k.scale(4),k.z(2)]);
      for(const [frame,x] of [[264,-112],[265,-48]]) scene.add([k.sprite("spritesheet",{frame}),k.pos(x,36),k.scale(4),sofaTint(k,frame,4),k.z(3)]);
      scene.add([k.sprite("laptop"),k.pos(-60,16),k.scale(2),k.z(4)]);
      scene.add([k.rect(70,64),k.pos(80,-28),k.color(k.Color.fromHex("#311047"))]);
      scene.add([k.rect(58,42),k.pos(86,-22),k.color(k.Color.fromHex("#72d8ce"))]);
      scene.add([k.text("PORTAL THE TV",{font:"Bungee",size:6}),k.pos(86,26),k.color(k.Color.fromHex("#fff0d1"))]);
    }
    scene.add([k.text("SPACE — SKIP",{font:"Nunito",size:12}),k.pos(-58,85),k.color(k.Color.fromHex("#fff0d1")),k.z(8)]);
  }
  return { play, clear, finish, isActive:()=>Boolean(scene), update(paused=false) {
    if(!scene||paused)return;
    elapsed+=k.dt();scene.pos=k.center();scene.scale=k.vec2(Math.min(1,(innerWidth-20)/440,(innerHeight-40)/220));
    if(moving)moving.pos.x=reducedMotion.matches?0:-160+elapsed*160;
    if(elapsed>=1.9)finish();
  }};
}
