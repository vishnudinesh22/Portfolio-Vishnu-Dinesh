// Runtime shaders preserve the original PNGs, pixel texture, and collision map.
export function loadPalettes(k) {
  k.loadShader("sofa-palette", undefined, `uniform vec2 origin; uniform vec2 extent; uniform float tintRows;
  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 c = def_frag();
    if ((uv.y-origin.y)/extent.y*16.0 >= tintRows) return c;
    if (distance(c.rgb, vec3(139.0,39.0,71.0)/255.0)<0.01) c.rgb=vec3(105.0,136.0,137.0)/255.0;
    if (distance(c.rgb, vec3(178.0,92.0,52.0)/255.0)<0.01) c.rgb=vec3(165.0,180.0,156.0)/255.0;
    return c;
  }`);
}
export function applyFloorPalette(k, map, data) {
  const layers=data.layers.filter(l=>l.type==="tilelayer");
  const ground=layers.find(l=>l.name==="ground");
  const cells=ground.data.flatMap((tile,index)=>tile===67 || tile===66 ? [index] : []);
  const mask=cells.map(i=>`(cell.x==${i%data.width}.0 && cell.y==${Math.floor(i/data.width)}.0)`).join(" || ");
  k.loadShader("floor-palette", undefined, `uniform vec2 origin; uniform vec2 extent;
    vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
      vec4 c=def_frag(); vec2 cell=floor((uv-origin)/extent*vec2(27.0,13.0));
      if (${mask || "false"}) {
        if(distance(c.rgb,vec3(226.0,174.0,96.0)/255.0)<0.01)c.rgb=vec3(145.0,165.0,160.0)/255.0;
        else if(distance(c.rgb,vec3(178.0,92.0,52.0)/255.0)<0.01)c.rgb=vec3(99.0,123.0,121.0)/255.0;
        else if(distance(c.rgb,vec3(247.0,239.0,186.0)/255.0)<0.01)c.rgb=vec3(199.0,208.0,181.0)/255.0;
        else if(distance(c.rgb,vec3(139.0,39.0,71.0)/255.0)<0.01)c.rgb=vec3(86.0,100.0,103.0)/255.0;
      } return c;
    }`);
  const frame=k.getSprite("map").data.frames[0];
  map.use(k.shader("floor-palette",{origin:k.vec2(frame.x,frame.y),extent:k.vec2(frame.w,frame.h)}));
  // Restore original foreground alpha pixels over the tinted floor, so furniture
  // and carpet palettes remain intact and the floor beneath them is consistent.
  for(const layer of layers.filter(l=>l!==ground))layer.data.forEach((tile,index)=>{
    if(tile && cells.includes(index))map.add([k.sprite("spritesheet",{frame:tile-1}),k.pos(index%data.width*16,Math.floor(index/data.width)*16),k.z(0)]);
  });
}
export function sofaTint(k,frame,rows=16) {
  const quad=k.getSprite("spritesheet").data.frames[frame];
  return k.shader("sofa-palette",{origin:k.vec2(quad.x,quad.y),extent:k.vec2(quad.w,quad.h),tintRows:rows});
}
export function addSofa(k,parent,x=96,y=96,scale=1) {
  for (const [frame,dx,dy] of [[226,0,0],[227,16,0],[264,0,16],[265,16,16]])
    parent.add([k.sprite("spritesheet",{frame}),k.pos(x+dx*scale,y+dy*scale),k.scale(scale),sofaTint(k,frame,dy?4:16),k.z(1)]);
}
