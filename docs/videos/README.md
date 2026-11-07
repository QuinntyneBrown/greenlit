# Videos

Narrated videos built from a transcript, a slide deck and free audio, by `tools/video-audio` and
`tools/video-build` (see the `creating-videos` skill).

| # | Video | Runtime | Where it plays |
|---|---|---|---|
| 01 | [Meet Greenlit](01-meet-greenlit/README.md) | ~0:19 | Marketing page hero (`docs/mocks/pages/marketing`, `#watch`) |

## Voice

The narrator is Kokoro-82M `af_heart` from Hugging Face ([hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M),
Apache-2.0), free and offline after the first model download. It is the voice Shelfie's videos use.

```sh
python3.12 -m venv .cache/venv && .cache/venv/bin/pip install kokoro soundfile   # once; espeak-ng helps
PYTHON=.cache/venv/bin/python node tools/video-audio/generate-audio.mjs docs/videos/01-meet-greenlit --engine kokoro
```

`KOKORO_VOICE` (default `af_heart`) and `KOKORO_SPEED` (default `0.9`) shape it.

## Captions

Marketing videos burn in no captions. `build-video.mjs --no-captions` leaves the picture clean and still
writes `<name>.vtt`; the page offers it as a `<track>` without `default`, so captions are off until a
viewer turns them on.

## Music

See [assets/music](assets/music/README.md) for each track's source and licence.
