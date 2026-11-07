# video-audio

`generate-audio.mjs` turns `docs/videos/NN-name/script.md` into `NN-name.mp3` and a timing manifest in
`.cache/NN-name/manifest.json`. Engines: `edge` (default), `piper`, `azure` and `kokoro` (Kokoro-82M from
Hugging Face, free and offline; `kokoro_say.py` runs it). `--dry-run` validates and estimates; `--spoken`
prints what the narrator says. `pronunciations.json` holds spoken replacements. See `docs/videos/README.md`.
