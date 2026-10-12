export function placeEdgeArrow(angle, viewport, exclusions, size = 40) {
  const margin = size / 2 + 8;
  const cx = viewport.width / 2, cy = viewport.height / 2;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const distance = Math.min((cx - margin) / Math.max(0.001, Math.abs(dx)), (cy - margin) / Math.max(0.001, Math.abs(dy)));
  const ideal = { x: cx + dx * distance, y: cy + dy * distance };
  const candidates = [ideal];
  for (let offset = 0; offset <= Math.max(viewport.width, viewport.height); offset += 44) {
    for (const sign of [-1, 1]) {
      const x = Math.max(margin, Math.min(viewport.width - margin, ideal.x + sign * offset));
      const y = Math.max(margin, Math.min(viewport.height - margin, ideal.y + sign * offset));
      candidates.push({ x: margin, y }, { x: viewport.width - margin, y }, { x, y: margin }, { x, y: viewport.height - margin });
    }
  }
  return candidates.filter(p => !exclusions.some(b => p.x + size / 2 > b.left && p.x - size / 2 < b.right && p.y + size / 2 > b.top && p.y - size / 2 < b.bottom))
    .sort((a,b) => Math.hypot(a.x-ideal.x,a.y-ideal.y)-Math.hypot(b.x-ideal.x,b.y-ideal.y))[0];
}
