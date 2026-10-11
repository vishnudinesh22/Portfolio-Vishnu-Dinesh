// A small collision-aware grid uses the same furniture geometry as the game.
export function createNavigator(boundaries, table) {
  const obstacles = [...boundaries, { x: table.x, y: table.y + table.solidY, width: table.width, height: table.solidHeight }];
  const step = 4;
  const key = (x, y) => `${x},${y}`;
  const clear = (x, y) => x >= 53 && x <= 331 && y >= 70 && y <= 167 && !obstacles.some(b =>
    x + 5 > b.x && x - 5 < b.x + Math.max(1, b.width) && y + 8 > b.y && y - 2 < b.y + Math.max(1, b.height));
  return (from, goal) => {
    const sx = Math.round(from.x / step) * step, sy = Math.round(from.y / step) * step;
    const open = [[sx, sy]], visited = new Map([[key(sx, sy), null]]);
    let found;
    for (let i = 0; i < open.length; i++) {
      const [x, y] = open[i];
      if (Math.hypot(x - goal.x, y - goal.y) < 21) { found = [x, y]; break; }
      for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, ny = y + dy, id = key(nx, ny);
        if (!visited.has(id) && clear(nx, ny)) { visited.set(id, [x, y]); open.push([nx, ny]); }
      }
    }
    if (!found) return goal;
    const route = [found];
    while (visited.get(key(...route[route.length - 1]))) route.push(visited.get(key(...route[route.length - 1])));
    return { x: route[Math.max(0, route.length - 5)][0], y: route[Math.max(0, route.length - 5)][1] };
  };
}
