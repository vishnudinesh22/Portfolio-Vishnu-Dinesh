// Reserve a tab during the trusted gesture; navigate only after the celebration.
export function createPortfolioTransition({ openTab, celebrate, feedback, schedule = setTimeout }) {
  let pending = false;
  function open(url, firstCompletion) {
    if (pending) return;
    let tab;
    try {
      tab = openTab();
      if (tab) {
        tab.opener = null;
        tab.document.title = "Opening Vishnu’s portfolio";
        const policy = tab.document.createElement?.("meta");
        if (policy) { policy.name = "referrer"; policy.content = "no-referrer"; tab.document.head.append(policy); }
        tab.document.body.textContent = "Opening the portfolio in a moment…";
      }
    } catch { /* The existing visible link remains a usable fallback. */ }
    const navigate = () => {
      pending = false;
      try {
        if (tab && !tab.closed) { tab.location.replace(url); feedback(""); return; }
      } catch { /* Popup restrictions must not trap the visitor. */ }
      feedback("Your browser blocked the new tab. Use the portfolio link below to open it.");
    };
    if (!firstCompletion) { navigate(); return; }
    pending = true;
    try { celebrate(); } catch { /* Sound is optional. */ }
    feedback("Story complete! Opening your portfolio…");
    schedule(navigate, 850);
  }
  open.isPending = () => pending;
  return open;
}
