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
    element.dataset.workstation = String(Boolean(object.link));
    element.dataset.revealed = "false";
    container.append(element);
    return { object, element };
  });
  return function update({ activeId, visibleIds = [], selectedId, toScreen, viewport, exclusions }) {
    const occupied = [...exclusions];
    for (const { object, element } of labels) {
      const active = object.id === activeId || visibleIds.includes(object.id);
      element.dataset.selected = String(Boolean(object.link) && object.id === selectedId);
      if (element.dataset.active !== String(active)) element.dataset.active = String(active);
      if (!active) { element.dataset.revealed = "false"; continue; }
      // Activation happens even off-screen; camera entry never replays the pop.
      element.dataset.revealed = "true";
      // Labels follow their original workstation coordinates with the camera.
      const point = toScreen(object.labelX ?? object.x, object.labelY ?? object.y - 18);
      const objectPoint = toScreen(object.x, object.y);
      if (objectPoint.x < 0 || objectPoint.x > viewport.width || objectPoint.y < 0 || objectPoint.y > viewport.height) {
        element.style.visibility = "hidden";
        continue;
      }
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (!object.link) {
        const left=point.x-width/2, top=point.y-height;
        const box={left,right:left+width,top,bottom:top+height};
        element.style.left=left+"px";element.style.top=top+"px";
        element.style.visibility=occupied.some(other=>overlaps(box,other))?"hidden":"visible";
        occupied.push(box);
        continue;
      }
      const positions = object.link ? [
        { x: point.x - width / 2, y: point.y - height },
        { x: point.x + 25, y: point.y - height },
        { x: point.x - width - 25, y: point.y - height },
        { x: point.x - width / 2, y: point.y - height - 36 },
        ...occupied.filter(box => box.top < point.y && box.bottom > point.y - height - 36 && box.left < point.x + width / 2 && box.right > point.x - width / 2)
          .map(box => ({ x: point.x - width / 2, y: box.top - height - 8 })),
      ] : [
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
        if (!occupied.some(box => overlaps(rect, box))) { position = { left, top }; break; }
      }
      element.style.visibility = position ? "visible" : "hidden";
      if (position) {
        element.style.left = position.left + "px";
        element.style.top = position.top + "px";
        occupied.push({ left: position.left, right: position.left + width, top: position.top, bottom: position.top + height });
        if (object.link) element.dataset.revealed = "true";
      }
    }
  };
}
