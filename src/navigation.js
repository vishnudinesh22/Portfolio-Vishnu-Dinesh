// A small collision-aware grid uses the same furniture geometry as the game.
export function createNavigator(boundaries, table) {
  const obstacles = [...boundaries, { x: table.x, y: table.y + table.solidY, width: table.width, height: table.solidHeight }];
  const step = 4;
  const key = (x, y) => `${x},${y}`;
  const clear = (x, y) => x >= 53 && x <= 331 && y >= 70 && y <= 167 && !obstacles.some(b =>
    x + 5.5 > b.x && x - 5.5 < b.x + Math.max(1, b.width) && y + 8.5 > b.y && y - 2.5 < b.y + Math.max(1, b.height));
  function path(from, goal, tolerance = 21) {
    const sx = Math.round(from.x / step) * step, sy = Math.round(from.y / step) * step;
    const open = [[sx, sy]], visited = new Map([[key(sx, sy), null]]);
    let found;
    for (let i = 0; i < open.length; i++) {
      const [x, y] = open[i];
      if (Math.hypot(x - goal.x, y - goal.y) < tolerance) { found = [x, y]; break; }
      for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, ny = y + dy, id = key(nx, ny);
        if (!visited.has(id) && clear(nx, ny)) { visited.set(id, [x, y]); open.push([nx, ny]); }
      }
    }
    if (!found) return null;
    const route = [found];
    while (visited.get(key(...route[route.length - 1]))) route.push(visited.get(key(...route[route.length - 1])));
    return route.reverse().map(([x,y])=>({x,y}));
  }
  const navigate=(from,goal)=>{const route=path(from,goal);return route?.[Math.min(4,route.length-1)] || from;};
  navigate.path=path;
  navigate.clear=clear;
  return navigate;
}

// Keep every turn while dropping intermediate collinear grid points.
export function routeCorners(route) {
  return route.filter((point,index)=>index===0 || index===route.length-1 ||
    point.x-route[index-1].x!==route[index+1].x-point.x ||
    point.y-route[index-1].y!==route[index+1].y-point.y);
}
