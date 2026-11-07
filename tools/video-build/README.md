# video-build

`build-video.mjs docs/videos/NN-name` renders `slides.html` to 1920x1080 PNGs with headless Chrome, times
them to the narration manifest (`data-cue` on each slide), mixes in `data-music`, and encodes
`NN-name.mp4`. `--check` resolves the cues, `--slides-only` renders PNGs, `--no-captions` leaves the picture
clean. A `NN-name.vtt` caption file is always written next to the video. Needs Chrome and ffmpeg with libx264.
