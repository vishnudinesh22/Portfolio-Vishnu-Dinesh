import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createQuestMachine,STORY_STORAGE_KEY} from '../src/questState.js';
import {portfolioConfig} from '../src/portfolioConfig.js';
const quests=portfolioConfig.story.quests;
function memory(initial){let value=initial;return{getItem:()=>value,setItem:(key,next)=>{assert.equal(key,STORY_STORAGE_KEY);value=next;},removeItem:()=>value=null};}
function finish(machine,id){machine.dispatch({type:'interact',id});machine.dispatch({type:'dialogue-finished',id});}
test('ordered unique completions, category switching, and one victory eligibility',()=>{
 const m=createQuestMachine(quests,memory());assert.equal(m.dispatch({type:'interact',id:'degree'}).changed,false);
 for(const q of quests.slice(0,5))finish(m,q.id);
 m.dispatch({type:'choose',category:'uiux'});assert.equal(m.dispatch({type:'visit',category:'industrial'}).completedNow,false);
 assert.equal(m.dispatch({type:'visit',category:'uiux'}).completedNow,true);assert.equal(m.dispatch({type:'visit',category:'uiux'}).completedNow,false);
 m.dispatch({type:'choose',category:'industrial'});assert.equal(m.getState().progress,100);
});
test('refresh retains Quest 2, safe position data and football collection without replaying thoughts',()=>{
 const storage=memory(),m=createQuestMachine(quests,storage);finish(m,'football');m.dispatch({type:'snapshot',position:{x:152,y:132},thought:'cycling'});
 const restored=createQuestMachine(quests,storage).getState();assert.equal(restored.questIndex,1);assert.deepEqual(restored.completed,['football']);assert.deepEqual(restored.position,{x:152,y:132});assert.deepEqual(restored.thoughtsSeen,['cycling']);
});
test('certificate, walking, completion and free exploration survive refresh',()=>{
 const storage=memory(),m=createQuestMachine(quests,storage);for(const q of quests.slice(0,5))finish(m,q.id);
 m.dispatch({type:'choose',category:'industrial'});m.dispatch({type:'snapshot',walking:true,position:{x:200,y:120}});
 assert.equal(createQuestMachine(quests,storage).getState().walking,true);
 m.dispatch({type:'visit',category:'industrial'});m.dispatch({type:'snapshot',walking:false});
 assert.equal(createQuestMachine(quests,storage).getState().storyComplete,true);assert.equal(createQuestMachine(quests,storage).getState().completionDismissed,false);
 m.dispatch({type:'snapshot',completionDismissed:true});assert.equal(createQuestMachine(quests,storage).getState().completionDismissed,true);
});
test('interrupted cutscene remains pending; completed scene is never replayed',()=>{
 const storage=memory(),m=createQuestMachine(quests,storage);finish(m,'football');m.dispatch({type:'interact',id:'cycling'});
 assert.equal(createQuestMachine(quests,storage).getState().pending,'cycling');m.dispatch({type:'dialogue-finished',id:'cycling'});
 assert.equal(createQuestMachine(quests,storage).getState().pending,null);assert.equal(createQuestMachine(quests,storage).getState().questIndex,2);
});
test('corrupt, incompatible, noncontiguous and unavailable storage recover safely',()=>{
 for(const value of ['invalid',JSON.stringify({version:2,completed:[]}),JSON.stringify({version:3,completed:['football','degree']}),JSON.stringify({version:3,completed:quests.map(q=>q.id)})])assert.equal(createQuestMachine(quests,memory(value)).getState().progress,0);
 const m=createQuestMachine(quests,{getItem(){throw Error();},setItem(){throw Error();}});finish(m,'football');assert.equal(m.getState().questIndex,1);
});
test('restart removes only story progress and modal presentation does not erase pending progress',()=>{
 const values=new Map([['design-world-sound','off'],['a-day-tracker-collapsed','yes']]);const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const m=createQuestMachine(quests,storage);m.dispatch({type:'interact',id:'football'});m.dispatch({type:'presentation',phase:'RESTART_CONFIRMATION'});assert.equal(m.getState().pending,'football');m.dispatch({type:'restart'});
 assert.equal(values.has(STORY_STORAGE_KEY),false);assert.equal(values.get('design-world-sound'),'off');assert.equal(values.get('a-day-tracker-collapsed'),'yes');assert.equal(m.getState().progress,0);
});
