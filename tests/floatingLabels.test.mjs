import {test} from "node:test";
import assert from "node:assert/strict";
import {createFloatingLabels} from "../src/floatingLabels.js";
test("workstation labels unlock together, keep their reveal when switching or moving, and reset with the story",()=>{
  const original=globalThis.document;
  try {
    globalThis.document={createElement:()=>({dataset:{},style:{},offsetWidth:100,offsetHeight:24})};
    const elements=[];
    const update=createFloatingLabels({append:e=>elements.push(e)},[
      {id:"uiux",label:"UI/UX DESIGN",x:238,y:89,labelY:77,link:"uiux"},
      {id:"industrial",label:"INDUSTRIAL DESIGN",x:317,y:143,labelY:124,link:"industrial"},
    ]);
    let shift=0;
    const base={toScreen:(x,y)=>({x:x+shift,y:y+100}),viewport:{width:800,height:600},exclusions:[]};
    update(base);assert.ok(elements.every(e=>e.dataset.active==="false"));
    update({...base,visibleIds:["uiux","industrial"],selectedId:"uiux"});
    assert.ok(elements.every(e=>e.dataset.active==="true"&&e.dataset.revealed==="true"));
    assert.deepEqual(elements.map(e=>e.dataset.selected),["true","false"]);
    const previous=parseFloat(elements[0].style.left);shift=20;
    update({...base,visibleIds:["uiux","industrial"],selectedId:"industrial"});
    assert.equal(parseFloat(elements[0].style.left),previous+20);
    assert.ok(elements.every(e=>e.dataset.revealed==="true"));
    assert.deepEqual(elements.map(e=>e.dataset.selected),["false","true"]);
    update(base);assert.ok(elements.every(e=>e.dataset.active==="false"&&e.dataset.revealed==="false"));
  } finally { if(original===undefined)delete globalThis.document;else globalThis.document=original; }
});
