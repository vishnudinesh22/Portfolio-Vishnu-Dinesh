import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {placeEdgeArrow} from '../src/questGuidance.js';
test('game ending contains no programmatic tab reservation or delayed portfolio navigation',()=>{
 const story=readFileSync(new URL('../src/story.js',import.meta.url),'utf8');
 assert.doesNotMatch(story,/window\.open|location\.replace|transition\.reserve|createPortfolioTransition/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<a id="completion-portfolio" target="_blank" rel="noopener noreferrer">/);
});
test('edge guidance stays clear of HUD and inside viewport',()=>{
 const p=placeEdgeArrow(-Math.PI/2,{width:390,height:844},[{left:0,top:0,right:390,bottom:230}]);assert.ok(p.y>=250);assert.ok(p.x===28||p.x===362);
});
