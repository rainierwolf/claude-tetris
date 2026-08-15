# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A classic Tetris implementation in vanilla JavaScript with HTML5 Canvas and CSS — no dependencies, no build step, no package manager. The entire game logic lives in `game.js` (~300 lines).

## Running the game

No install or build required. Either open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 8000   # or: npx serve .   /   php -S localhost:8000
```

Then visit `http://localhost:8000`. There is no test suite, linter, or build/watch command in this repo.

## Architecture

Three files, each with a single responsibility:

- **`index.html`** — DOM structure: the main `<canvas id="board">` (300×600, i.e. `COLS × BLOCK` by `ROWS × BLOCK`), a side panel with score/lines/level and a `<canvas id="next-canvas">` preview, and a shared overlay div used for both pause and game-over states.
- **`style.css`** — dark/retro arcade visual theme (flexbox layout, monospace HUD, `backdrop-filter` on the overlay).
- **`game.js`** — all game logic, structured around a small set of global `let` state variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) mutated by functions rather than any framework/class model.

### Core mechanics in `game.js`

- **Board model**: `ROWS × COLS` matrix where each cell is `0` (empty) or a 1–7 color index tied to a piece type (`COLORS`/`PIECES` arrays).
- **Pieces**: defined as square matrices in `PIECES`. Rotation is a transpose+reverse (`rotateCW`), not a lookup table of rotation states.
- **Collision** (`collide`): bounds/overlap check against the board, used for movement, rotation, and ghost-piece projection.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` columns until a non-colliding position is found, else the rotation is discarded.
- **Line clears** (`clearLines`): scans bottom-up, splices out full rows, unshifts empty rows at the top; re-checks the same index after a splice (`r++`) since rows shift down.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/cell dropped, soft drop adds 1 pt/row.
- **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece** (`ghostY`): projects the current piece straight down until collision, drawn at `globalAlpha = 0.2`.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time in `dropAccum` and drops the piece one row once `dropInterval` is exceeded, then calls `lockPiece()` on collision (merge → clear lines → spawn next).
- Input is handled by a single `keydown` listener (arrows + `X` to rotate, `Space` for hard drop, `P` to pause); `restartBtn` re-invokes `init()`.

When changing board dimensions, update `COLS`/`ROWS`/`BLOCK` in `game.js` together with the `<canvas id="board">` `width`/`height` in `index.html` (must stay `COLS × BLOCK` and `ROWS × BLOCK`).

The README (`README.md`, in Spanish) has more detail on controls and the full game flow diagram if needed.
