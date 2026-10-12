# A Day in Vishnu's World V2

A six-quest personal story built on the original Kaboom.js portfolio, room, character, sprite sheet, walking animations, collision geometry, and camera.

## Run locally

Run `npm install`, then `npm run dev` and open the local address it prints. `npm test` runs regression tests; `npm run build` creates production files; `npm run preview` serves that build. No new runtime dependencies were added.

## Story and controls

1. Collect the football.
2. Meet Rocky the Cycle and watch a short cycling scene.
3. Turn on Portal the TV.
4. Find Blendy the Couch and watch a short sofa-working scene.
5. Read DESIGN THINKER / VIA VIT SCHOOL OF DESIGN.
6. Choose UI/UX Design or Industrial Design. The original character walks to the selected workstation, plays the victory sound, and reveals a portfolio link for you to click.

Arrow keys, WASD, or holding click/touch move the character. Space advances a thought, interacts with the current nearby objective, skips a cutscene, or closes the certificate. The certificate also has a close button and supports Escape. Focused HTML buttons retain normal Space activation without another game interaction.

Escape closes an open panel first. During active quests it asks RESTART YOUR DAY? No or Escape resumes the current state; Yes resets quests, dialogue, football, temporary presentation, saved progress, and character position to the initial spawn. Audio and tracker preferences are retained. After completion, Escape reopens the completion panel; Escape while that panel is open resumes exploration.

View My Work provides immediate accessible portfolio links without completing quests. Help reopens the controls. Both workstation labels unlock only at Quest 6. Each active objective immediately activates its world-anchored Bungee label with a 320 ms pop, red waypoint, and off-screen arrow. Labels stay above their objects and never move to the screen edge. Reduced motion disables the pop.

There is one short thought at the start of each of Quests 1–5, with no completion thoughts. These appear in full, auto-dismiss after a readable 2.2–3.1 seconds, and can be dismissed early with Space. Movement, labels, and guidance activate immediately without waiting for the thought. The final question is part of the persistent portfolio choices; decision panels never auto-dismiss.

## Walking, completion, and manual portfolio links

Category selection closes the choices and starts a collision-safe walk at three times normal speed, keeping every turn and removing intermediate stops. The original animations and normal manual speed are preserved. Only physical arrival at the safe workstation approach completes the final quest. The character stops, the victory sound starts once, and a compact completion panel shows the selected category's real link, Resume Game, and Restart Game. No tabs are reserved, no links open automatically, and no delayed navigation runs. All portfolio links open only through explicit visitor activation in a new tab with noopener noreferrer.

Resume Game closes the panel and permits free exploration without losing progress or position. The story menu can reopen the completion panel. Restart Game asks for confirmation and begins a new story. Muted or unavailable audio never blocks the completion panel. Auto-walk pauses during restart confirmation; a failed route exposes a manual recovery link and allows category selection to retry without inventing completion.

## Saved progress

Version 3 data under the existing story-storage key saves ordered completed quests, pending interactions, selected category, position, seen thoughts, active walking, completion, and the Resume Game preference. Football collection, TV activation, certificate and cutscene completion flags are saved and derived from validated ordered progress. Corrupt, noncontiguous, or incompatible data falls back safely; saved positions are checked against the original collision geometry and corrected to a navigable point when needed.

Important quest transitions save immediately. Position saves occur after meaningful movement at most once per 0.8 seconds, plus a final snapshot when leaving the page. Refresh restores the current quest and labels, resumes an interrupted final walk, or resumes an unfinished cutscene/certificate. Completed cutscenes and already-seen thoughts do not repeat. A completed-game reload restores its completion panel without replaying the victory sound; after Resume Game, reload restores free exploration with a visible way to reopen the panel. External links never open on refresh. Storage failures leave the game playable in memory.

## Artwork and cutscenes

Original PNGs and prop SVGs remain unchanged. Runtime shaders change only floor palette colors and selected sofa upholstery pixels, preserving shading, texture, tile boundaries, carpets, furniture, and map collisions. Original foreground tiles restore artwork above the floor tint.

The two cutscenes are 1.9-second compositions using actual character frames, bicycle, sofa, and laptop. Cycling uses a simple pixel background and side-view character/bicycle movement; working layers the original seated-looking character and sofa with a laptop and TV. They use no generated character artwork. Reduced motion disables cycling translation and interface bounce/pop animations.

## Personalize and source

`src/portfolioConfig.js` owns exact storyline text, quest order, personal details, and portfolio URLs. Both current `example.com` URLs remain placeholders. The certificate is a personal design-journey statement; no official seals or certification claims have been added.

- `src/story.js`: interactions, overlays, restart confirmation, certificate, and auto-walk.
- `src/questState.js`, `src/storyPersistence.js`: ordered progress, presentation phases, versioned validation, and saving.
- `src/navigation.js`: routes around original collision geometry.
- `src/cutscenes.js`, `src/palette.js`: original-sprite scenes and runtime palette changes.
- `src/dialogueQueue.js`, `src/floatingLabels.js`: dialogue pause/resume and camera-following labels.
- `src/worldObjects.js`, `src/discoveryAudio.js`: object definitions and existing audio effects/preferences.
- `index.html`, `src/style.css`: responsive pixel-styled controls and overlays.

Bungee and Nunito are self-hosted with their licenses. Original assets are retained from Kallin43/portfolio. Recoverable pre-V2 checkpoint: `125b16d`.
