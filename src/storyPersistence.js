export const SAVE_VERSION = 3;
export function readStorySave(storage, key, quests) {
  try {
    const saved=JSON.parse(storage?.getItem(key) || "null");
    if(saved?.version!==SAVE_VERSION || !Array.isArray(saved.completed) || saved.completed.length>quests.length)return null;
    if(saved.completed.some((id,index)=>id!==quests[index].id))return null;
    const selectedCategory=["uiux","industrial"].includes(saved.selectedCategory)&&saved.completed.length>=5?saved.selectedCategory:null;
    if(saved.completed.length===6&&!selectedCategory)return null;
    const position=saved.position;
    return {
      completed:saved.completed,selectedCategory,
      pending:saved.completed.length<5&&saved.pending===quests[saved.completed.length].id?saved.pending:null,
      position:position&&Number.isFinite(position.x)&&Number.isFinite(position.y)?{x:position.x,y:position.y}:null,
      thoughtsSeen:Array.isArray(saved.thoughtsSeen)?saved.thoughtsSeen.filter(id=>quests.some(q=>q.id===id)):[],
      completionDismissed:saved.completed.length===6&&saved.completionDismissed===true,
      walking:Boolean(selectedCategory&&saved.walking===true),
    };
  }catch{return null;}
}
export function writeStorySave(storage,key,state) {
  try{storage?.setItem(key,JSON.stringify({version:SAVE_VERSION,...state}));}catch{/* Play also works without browser storage. */}
}
