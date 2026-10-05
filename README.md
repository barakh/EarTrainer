# Ear Trainer

A small browser-based ear-training app. Listen to a note and identify it by
choosing the matching key on a piano.

**Live:** https://barakh.github.io/EarTrainer/

## Features

- **Note identification** — a note is played and you pick from four options,
  each drawn as a piano keyboard with the note highlighted.
- **Progressive levels** — start with a handful of notes and unlock the full
  chromatic scale as you answer correctly.
- **Keyboard-only play** — answer, replay, and advance without a mouse.
- **Score & progress** — level progress is saved in `localStorage`, so you can
  pick up where you left off.

## How to play

1. Press **Play note** (or **Space**) to hear the note.
2. Choose the option you think matches what you heard.
3. After answering, the correct option is highlighted. Press **Next** to
   continue.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1`–`4` | Choose the matching option |
| `Space` / `R` | Replay the note |
| `Enter` / `N` | Next question (after answering) |

## Levels

| Level | Notes | Correct answers to unlock next |
| --- | --- | --- |
| 1 | C · D · E · F | 8 |
| 2 | White keys (C D E F G A B) | 8 |
| 3 | All 12 notes | 12 |

Use **Reset progress** to return to level 1. You can also jump to any level at
any time using the level buttons above the progress bar — progress is tracked
separately for each level.

## Running locally

No build step is required. Serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Tech

Plain HTML, CSS, and JavaScript. Sound is generated with the
[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
and the keyboards are inline SVG. Hosted on GitHub Pages.

## License

[MIT](LICENSE)
