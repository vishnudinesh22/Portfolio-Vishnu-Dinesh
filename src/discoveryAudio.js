// Reuse Kaboom's AudioContext; synthesis needs no downloads or audio assets.
export function setupDiscoveryAudio(context) {
  const button = document.getElementById("sound-toggle");
  let enabled = true;
  let unlocked = false;
  try { enabled = localStorage.getItem("design-world-sound") !== "off"; } catch { /* Storage is optional. */ }
  function render() {
    button.textContent = enabled ? "Sound on" : "Sound off";
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Mute discovery sounds" : "Enable discovery sounds");
  }
  function unlock(event) {
    if (!event.isTrusted) return;
    unlocked = true;
    try { context?.resume().catch(() => {}); } catch { /* Audio is optional. */ }
  }
  document.addEventListener("pointerdown", unlock, { capture: true });
  document.addEventListener("keydown", unlock, { capture: true });
  button.addEventListener("click", event => {
    enabled = !enabled;
    try { localStorage.setItem("design-world-sound", enabled ? "on" : "off"); } catch { /* Storage is optional. */ }
    render();
    if (event.detail > 0) document.getElementById("game").focus({ preventScroll: true });
  });
  render();
  function melody(frequencies, spacing, tail) {
    if (!enabled || !unlocked || !context || context.state !== "running") return;
    try {
      const master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
      const start = context.currentTime;
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const time = start + index * spacing;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(0.35, time + 0.025);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + tail - 0.02);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(time);
        oscillator.stop(time + tail);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
          if (index === frequencies.length - 1) master.disconnect();
        };
      });
    } catch { /* Muted or unsupported audio must never interrupt exploration. */ }
  }
  return {
    checkpoint: () => melody([523.25, 659.25, 783.99], 0.14, 0.3),
    complete: () => melody([523.25, 659.25, 783.99, 1046.5, 1318.51], 0.22, 0.4),
  };
}
