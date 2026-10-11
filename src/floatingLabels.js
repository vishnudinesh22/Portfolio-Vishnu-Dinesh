function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
export function createFloatingLabels(container, objects) {
  const labels = objects.map(object => {
    const element = document.createElement("span");
    element.className = "floating-label";
    element.textContent = object.label;
    element.dataset.object = object.id;
    element.dataset.active = "false";
    container.append(element);
    return { object, element };
  });
  return function update({ activeId, toScreen, viewport, exclusions }) {
    for (const { object, element } of labels) {
      const active = object.id === activeId;
      if (element.dataset.active !== String(active)) element.dataset.active = String(active);
      if (!active) continue;
      const point = toScreen(object.labelX ?? object.x, object.labelY ?? object.y - 18);
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const positions = [
        { x: point.x - width / 2, y: point.y - height },
        { x: point.x + 25, y: point.y },
        { x: point.x - width - 25, y: point.y },
        { x: point.x - width / 2, y: point.y + 58 },
      ];
      let position;
      for (const candidate of positions) {
        const left = Math.max(8, Math.min(viewport.width - width - 8, candidate.x));
        const top = Math.max(8, Math.min(viewport.height - height - 8, candidate.y));
        const rect = { left, right: left + width, top, bottom: top + height };
        if (!exclusions.some(box => overlaps(rect, box))) { position = { left, top }; break; }
      }
      element.style.visibility = position ? "visible" : "hidden";
      if (position) {
        element.style.left = position.left + "px";
        element.style.top = position.top + "px";
      }
    }
  };
}
