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

test("active quest labels activate off-screen, stay attached to their object, and do not wait for proximity",()=>{
  const original=globalThis.document;
  try{
    globalThis.document={createElement:()=>({dataset:{},style:{},offsetWidth:150,offsetHeight:24})};
    let element;
    const update=createFloatingLabels({append:e=>element=e},[{id:"cycling",label:"ROCKY THE CYCLE",x:198,y:119,labelY:106}]);
    let shift=1000;
    const base={activeId:"cycling",toScreen:(x,y)=>({x:x+shift,y:y+100}),viewport:{width:800,height:600},exclusions:[]};
    update(base);
    assert.equal(element.dataset.active,"true");assert.equal(element.dataset.revealed,"true");
    assert.equal(element.style.visibility,"hidden","Off-screen labels are never clamped to the viewport");
    shift=0;update(base);
    assert.equal(element.style.left,"123px");assert.equal(element.style.top,"182px");
    assert.equal(element.style.visibility,"visible");assert.equal(element.dataset.revealed,"true");
    update({...base,exclusions:[{left:0,right:500,top:0,bottom:500}]});
    assert.equal(element.style.left,"123px","HUD occlusion never relocates the label away from the object");
  }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
