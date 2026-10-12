# A Day in Vishnu's World

A six-stage evening story built on the existing Kaboom.js portfolio, original room graphics, character, movement, animations, camera, and collision system.

## Personalize

Edit `src/portfolioConfig.js` for your name, academic details, personal content, named objects, quest descriptions/actions, dialogue, and both portfolio URLs. The name is Vishnu; the example.com portfolio destinations remain placeholders.

The Certified Design Thinker caption is a personal storytelling statement, not a separate professional certification. Academic details are Bachelor of Design (B.Des) — Industrial Design at VIT Vellore.

## Explore

Use arrow keys or hold click/touch to walk. Nearby information and floating object labels appear automatically. Press Space or tap a nearby interaction prompt to complete the current objective:

1. Collect the football.
2. Meet Rocky, the bicycle; the evening advances from 4 PM to 6 PM.
3. Relax on Blendy, the couch.
4. Tune in to Portal, the TV.
5. Read the design certificate and complete the personal story.
6. Choose UI/UX Design or Industrial Design, then follow the hint to its workstation.

Choosing a category reveals Head to Workstation and Skip to Portfolio. Head to Workstation activates guidance; Skip to Portfolio opens that category’s configured URL immediately without completing Quest 6 or playing the celebration. At either workstation, press Space or click Open portfolio to deliberately open the configurable destination in a new tab with noopener noreferrer. Categories can be switched, and either workstation can be revisited.

Space is the single gameplay interaction key: dialogue takes priority, then the nearby object. Messages already appear in full, and each press advances just one thought. Native Space behavior remains available on focused HTML menu controls. The first chosen workstation reserves a tab immediately, starts the existing completion sound, and navigates after 850 ms; blocked tabs expose the direct links. Revisits and View My Work open normally without another celebration. Amber pixel pins mark only the active target, with collision-aware edge guidance when it is off-screen.

Dialogue bubbles follow the character and play through a readable queue without blocking movement. Recent thoughts and the current objective are available in the collapsible quest tracker. Only the current objective has a marker and discovery label. An off-screen arrow follows collision-aware waypoints. A restrained one-second camera glance yields to pointer movement and reduced-motion preferences.

View My Work offers accessible immediate links and all personal content without changing story progress. It is a non-modal view; the game stays active. Escape or Return to the story closes it. The first-visit control guide can be dismissed with Start Exploring, the close button, or Escape, and stays dismissed for that browser-tab session. Help reopens it without changing quests. Ordinary thoughts auto-dismiss as before; Next thought or Space voluntarily advances exactly one message and preserves its quest-transition callback.

## Progress and sound

Unique quest completions, football collection, story time, and the selected category are saved under `a-day-in-my-world-story-v1` when local storage is available. Refresh resumes the current objective without replaying achievements. Restart Game appears in the story menu only after all six objectives are completed. It clears story progress and queued dialogue, restores the football, and leaves character position, movement, and sound preferences intact.

The tracker shows 83% after the personal story and 100% after interacting with the chosen workstation. Repeated interactions and category switching do not add progress or replay achievements.

Kaboom's existing Web Audio context provides a soft three-note checkpoint chime (about 0.6 seconds) and a distinct five-note completion melody (about 1.3 seconds), both at 18% master gain. Sounds begin only after a trusted browser interaction. Sound on/off is saved separately. Audio and storage failures do not prevent play.

Bungee and Nunito are self-hosted in `public/fonts` with license files. Reduced-motion preferences disable label bounce, bubble transitions, pickup travel, and pulsing highlights. Cycling is represented by a brief time transition; no character or cycling sprites are replaced.

## Source organization

- `src/story.js`: connects the scene, quests, interactions, HUD, pickup, TV feedback, and category guidance.
- `src/questState.js`: dialogue-gated progression, persistence, restoration, and restart.
- `src/navigation.js`: waypoints around existing walls and furniture.
- `src/dialogueQueue.js`: ordered character dialogue, readable timing, recent thoughts, and viewport placement.
- `src/floatingLabels.js`: reusable named-object labels and overlay collision avoidance.
- `src/worldObjects.js`: scene object definitions from existing map boundaries and shared workstation sprite/collider geometry.
- `src/discoveryAudio.js`: two melodies, browser interaction unlock, and sound preferences.
- `index.html`, `src/style.css`, and `src/utils.js`: responsive HUD and accessible UI.

## Develop and verify

Run `npm install`, then `npm run dev`. Run `npm test` for quest-state and dialogue-queue regression tests, `npm run build` for production, and `npm run preview` to inspect the build. There is no lint script and no new runtime dependency.

The original assets are retained from Kallin43/portfolio. The football, bicycle, laptop, and prototype props keep the existing pixel grid and palette. The laptop remains in its existing position. The unchanged prototype table sits at (301, 126), beside the right wall; its collider and interaction target share this layout.
