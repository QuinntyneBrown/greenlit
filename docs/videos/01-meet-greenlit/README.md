# 01 · Meet Greenlit

> **Runtime:** ~0:19 (1.5 s of music, 14 s of narration, a 3 s music tail) · **Audience:** managers of small teams visiting the marketing page · **Prerequisites:** none

**Video:** [01-meet-greenlit.mp4](01-meet-greenlit.mp4) · [Slides](slides.html) · **Audio:** [01-meet-greenlit.mp3](01-meet-greenlit.mp3) · [Transcript](script.md) · [Captions](01-meet-greenlit.vtt)

## Why this video exists
The marketing page (`docs/mocks/pages/marketing/default.html`, "Greenlit in twenty seconds") plays this clip so a visitor gets the pitch without reading: the vacation spreadsheet, made simple; members paint and request, the manager confirms; one month for the team. It has no burned-in captions; the VTT is offered as a caption track that is off by default.

## Learning objectives
By the end, the viewer can:
- Say what Greenlit replaces (the vacation spreadsheet).
- Describe the flow: paint days, send the request, the manager confirms.
- Find the next step (create a team).

## Assets on screen
| File | What to show |
|---|---|
| `slides.html` | The messy spreadsheet; the Greenlit sheet; one member's days going blue, yellow, green; the team's month; the closing call to action. Built from the design-system tokens and `.cell` component. |
| `../assets/music/en-la-playa-soca.mp3` | Soca bed at −4 dB under the narration, starting 20 s into the track (its intro is quiet), with a 1.5 s lead-in and 3 s tail (JuliusH, Pixabay Content License). |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:01.5 | Lead-in | Music alone on the first slide |
| 00:01.5-00:04 | The pain | "Still keeping vacation in a spreadsheet?" |
| 00:02-00:04 | The sheet | "Greenlit is that sheet, made simple." |
| 00:04-00:06 | Paint and request | Blue days, then yellow |
| 00:06-00:09 | Confirm | Green, "Confirmed by Maya" |
| 00:09-00:12 | One month | The team's sheet |
| 00:13-00:19 | Close | Wordmark, "Get your team greenlit."; music plays on for 3 s |

## Demo commands
```sh
export PYTHON=$HOME/projects/shelfie/.cache/venv/bin/python   # any interpreter with kokoro and soundfile
node tools/video-audio/generate-audio.mjs docs/videos/01-meet-greenlit --engine kokoro
node tools/video-build/build-video.mjs docs/videos/01-meet-greenlit --check
node tools/video-build/build-video.mjs docs/videos/01-meet-greenlit --no-captions
cp docs/videos/01-meet-greenlit/01-meet-greenlit.mp4 docs/mocks/assets/marketing/meet-greenlit.mp4
cp docs/videos/01-meet-greenlit/01-meet-greenlit.vtt docs/mocks/assets/marketing/meet-greenlit.vtt
```
