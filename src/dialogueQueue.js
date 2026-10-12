// Real-time timers keep dialogue readable while the character continues moving.
export function createDialogueQueue(element, historyList) {
  const waiting = [];
  const recent = [];
  let current;
  let timer;
  let finishing = false;
  function advance() {
    if (!current || finishing) return;
    clearTimeout(timer);
    finishing = true;
    current.onEnd?.();
    element.dataset.active = "false";
    element.setAttribute("aria-hidden", "true");
    timer = setTimeout(next, 180);
  }
  function next() {
    finishing = false;
    current = waiting.shift();
    if (!current) {
      element.dataset.active = "false";
      element.setAttribute("aria-hidden", "true");
      return;
    }
    element.querySelector("p").textContent = current.text;
    element.dataset.active = "true";
    element.setAttribute("aria-hidden", "false");
    recent.push(current.text);
    if (recent.length > 6) recent.shift();
    historyList.replaceChildren(...recent.slice().reverse().map(text => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
    current.onStart?.();
    const milliseconds = current.duration ?? Math.min(7200, Math.max(3400, 1100 + current.text.split(/\s+/).length * 310));
    timer = setTimeout(advance, milliseconds);
  }
  function enqueue(messages) {
    for (const message of messages) {
      const item = typeof message === "string" ? { text: message } : message;
      if (current?.text === item.text || waiting.some(pending => pending.text === item.text)) continue;
      waiting.push(item);
    }
    if (!current) next();
  }
  function clear() {
    clearTimeout(timer);
    waiting.length = 0;
    current = undefined;
    finishing = false;
    recent.length = 0;
    historyList.replaceChildren();
    element.dataset.active = "false";
    element.setAttribute("aria-hidden", "true");
  }
  function position(point, viewport, blocked = [], objects = []) {
    if (element.dataset.active !== "true") return;
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const clamp = candidate => ({
      left: Math.max(8, Math.min(viewport.width - width - 8, candidate.left)),
      top: Math.max(8, Math.min(viewport.height - height - 8, candidate.top)),
    });
    const hits = (candidate, box) => candidate.left < box.right && candidate.left + width > box.left && candidate.top < box.bottom && candidate.top + height > box.top;
    const preferred = { left: point.x - width / 2, top: point.y - 66 - height };
    const positions = [preferred,
      { left: point.x - width - 34, top: preferred.top },
      { left: point.x + 34, top: preferred.top },
      { left: preferred.left, top: preferred.top - 96 },
      ...(objects.length ? [{ left: preferred.left, top: Math.min(...objects.map(box => box.top)) - height - 12 }] : []),
    ].map(clamp);
    const best = positions.find(candidate => ![...blocked, ...objects].some(box => hits(candidate, box))) || positions[0];
    let { left, top } = best;
    // Avoid the tracker and controls if the viewport is short or unusually narrow.
    for (const box of blocked) {
      if (left < box.right && left + width > box.left && top < box.bottom && top + height > box.top) {
        top = Math.min(viewport.height - height - 8, box.bottom + 8);
      }
    }
    element.style.left = left + "px";
    element.style.top = top + "px";
    element.style.setProperty("--tail-x", Math.max(16, Math.min(width - 16, point.x - left)) + "px");
  }
  return { enqueue, clear, advance, position, isActive: () => element.dataset.active === "true", isBusy: () => Boolean(current || waiting.length) };
}
