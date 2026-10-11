export function showProximityInfo(stop) {
  const panel = document.getElementById("textbox-container");
  const active = Boolean(stop);
  panel.dataset.active = String(active);
  panel.setAttribute("aria-hidden", String(!active));
  panel.inert = !active;
  if (!stop) return;
  document.getElementById("dialogue-title").textContent = stop.title;
  document.getElementById("dialogue").textContent = stop.text;
  const note = document.getElementById("story-note");
  note.textContent = stop.note || "";
  note.hidden = !stop.note;
  const destination = document.getElementById("portfolio-link");
  destination.hidden = !stop.link;
  if (stop.link) {
    destination.href = stop.link;
    destination.textContent = "Open portfolio ↗";
  } else destination.removeAttribute("href");
}
export function setCamScale(k) {
  k.camScale(k.vec2(k.width() / k.height() < 1 ? 1 : 1.5));
}
