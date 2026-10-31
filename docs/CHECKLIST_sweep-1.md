# Sweep 1 checklist (branch `claude/sweep-1`, 31 October 2026)

The branch sits on top of `claude/docs` (which is `claude1` plus 8 documentation commits), so merging goes:
docs into `claude1` first, then this branch as a fast-forward. Nothing here touches `main`.

Picture version for an iPad: the artifact "Sketchpad Sweep Review" (15 screens, each with what to look for).

## Commits (oldest first)

| Commit | What |
|---|---|
| `d0cffed` | Test setup: sync lock file, bootstrap dev dependency, import check |
| `47fb051` | Node service: refuse foreign origins, keep paths inside their folders |
| `3fa19dd` | Fix text encoding damage in comments and the Start–End label |
| `6443cf3` | Pursuit manifest: merge the Pursuit2 / pursuit2 duplicate |
| `c27301c` | Fast tab clicks, Utilities Result subtab, Gallery script path (with tests) |
| `4e7875f` | Remove the stale root copies of the Node scripts and ui/foo1.js |
| `8130df9` | Node service: remove the old manifest scanners (about 900 lines) |
| `15ec7f0` | Remove the unused render() fallback; fix a stale header, a sort quirk, duplicate keys |
| `0a8fd5b` | Help pages: match the code after the removals |
| `f6e9075` | Remove UI code nothing calls; keep one Draw runner, in ui/draw/ |
| `7107356` | nodeDispatch: say plainly when the Node service is not running |
| `ebf1119` | npm run build:static: a read-only copy any web server can host |

To drop any one of them: `git revert <commit>`.

## What was checked here, before you look

| Check | Result |
|---|---|
| `npm run lint:globals` | 0 errors, 7 warnings (the known `armInteractor` and `gl` ones; 4 fewer than before) |
| `npm run check:imports` | every import resolves |
| `npm run test:node` | 55 of 55 (the old Node code fails 36 of them) |
| `npm run test:tabs` | PASS, including new tests for fast tab clicks, Utilities Result, Gallery script path |
| `npm run build:static` | builds; tested with a plain web server: tabs, Draw, Patterns, Gallery scripts, Figures work |
| Real browser to Node service (with the new origin check) | works, including the JSON preflight request |
| Registry objects, 185 scripts | run before the sweep: no throws; removals did not touch them |

## A. Things you can check from the pictures

1. Chords in Ellipse (picture 3): the Mode list reads "Start–End", not "Startâ€“End".
2. Gallery > Scripts (picture 8): one "Pursuit Curves in Polygon" in the Pursuit group, count 10 (was 11).
3. Utilities after leaving and returning (picture 12): the Result subtab is there and highlighted.
4. Every other screen looks as it did.
5. Help pages (pictures 14, 15): the Removed notes read correctly.

## B. PC only

Start: `git fetch`, `git checkout claude/sweep-1`, `npm install`, then `sketchpad.bat` (or `npm run dev:sketchpad`).

1. Start-up. The Node window prints SUCCESS and "listening"; the browser opens with no red error.
2. Each of these needs the Node service. Do it, look for the result, and note any error text:
   - Draw: caption menu v, Create Thumbnail / Create Pattern / Save as secondary. A new file appears; no error.
   - Patterns or Gallery: Archive an item. The file moves into that category's `archive` folder and leaves the list.
   - Any tab: Edit Manifest, change a status. The status shows after the refresh.
   - Utilities: Show Logs lists log files. Utilities Commands: Rebuild and Validate prints a report.
   - Show Script > Open in VS Code on a script inside a folder with a space ("Curve Stitch"). Old Windows quoting
     is untested; this is the case most likely to fail.
   - Help: edit and save one help page (TinyMCE).
3. Stop the Node window, then try one of the above. The message should say the service did not answer and how to start it.
4. Open the app at `http://127.0.0.1:5173` (not localhost). The service calls fail, as before (it has always allowed
   only localhost:5173).
5. `npm run test:node`, `npm run check:imports`, `npm run test:tabs` all pass on Windows. (`test:tabs` needs the
   bootstrap dev dependency; `npm install` adds it.)
6. Open the Pursuit scripts in Gallery > Scripts and run "Pursuit Curves in Polygon".
7. `git status` after a run shows no unexpected changed manifests (if `home/manifest.json` or a category manifest
   changed, that is the start-up rebuild, as before).

## C. What failure looks like, per commit

- Node service commit: a Node-backed feature fails with HTTP 403 (origin) or 400 (a name it now refuses). The message names
  the field. Report the request and the name; the safe-path rules are in `node/safePaths.mjs`.
- Removal commits: a menu item or tab does nothing, or a red error naming a missing function. All removed names had no
  callers by search and by `check:imports`; a dynamic call by string is the only thing a search cannot see.
- Draw runner move: Draw opens an object but no handles, or it will not redraw when a slider moves.
- setUI: a tab does not open after a quick double click.
- Utilities: Result highlighted but empty after Rebuild and Validate.

## D. Not done, and why

| Item | Why not |
|---|---|
| Draw, Figures and Patterns share one set of object settings (reproduced) | A design decision for the core tab. Options: Draw works on its own copy, or each opens a copy. Needs your call. |
| Script state leak (two scripts fail after about 100 earlier scripts) | Needs a look at which `drawState` fields survive `resetCanvas()` before changing anything. |
| `029.JPG` listed in `gallery/Ideabook/possible/manifest.json`, file missing | I cannot recreate your file. Remove the entry or restore the file. |
| Unused packages `@jaames/iro`, `dexie`, `sharp`; TinyMCE advisories | Your confirmation. `npm audit fix` updates TinyMCE; check the help editor after. |
| Manifest phase: maintenance runs three times at start, import-time run with `process.exit(1)` | Belongs to the manifest phase you planned before Phase 10. |
| `index.html` structure work, `clearDivs()` list, window back doors | Not started. Needs the 7a plan from `NEXT_PASS.md`. |
| Bootstrap removal and CSS cleanup | Not started. Bootstrap's Reboot styles (box-sizing, fonts, button base) are used everywhere without being named, so removing it needs screenshot comparison on every screen. The pack script is the start of that method. |
| Splits: Node service, `menuCmds.js`, `uiUtilities.js`, `help.js` | Not started. The tests to guard the Node split are in place. |
| Phase items (handle-drop weld, delete layer, Phase 10, thumbnails, native color input, Phase 9 reshape, templates import, instrumentation) | Not started. Large, and each needs your eyes on the result. |
| Help Overview PDFs (`docs/*.pdf`) | Not regenerated; the HTML pages and the PDF builder are updated, so rebuilding gives current text. |

## E. A copy to look at without Node

`npm run build:static` writes `dist-static/` (about 6 MB, no internet needed). Serve it from the root of a site. See
`scripts/buildStatic.mjs` for the flags. Anything needing the Node service says so.
