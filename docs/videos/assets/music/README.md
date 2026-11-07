# Background music

Tracks a deck can name with `<body data-music="../assets/music/<file>">`. The video builder lays the
track under the narration, looped if it is shorter, at `data-music-db` (default −10.8 dB), faded in,
and holds the last slide 3 s after the narration so the music plays on and fades out. Keep the
provenance of every track here.

| File | Title and artist | Source | License |
| --- | --- | --- | --- |
| `en-la-playa-soca.mp3` | _En La Playa – Trinidad and Tobago Soca_ by JuliusH | [pixabay.com/music/world-en-la-playa-trinidad-and-tobago-soca-4662](https://pixabay.com/music/world-en-la-playa-trinidad-and-tobago-soca-4662/) | [Pixabay Content License](https://pixabay.com/service/license-summary/): free for commercial use, no attribution required |

`data-music-lead` (default 1.5 s) holds the first slide with music alone before the narration.
Pixabay's pages sit behind a bot check; the MP3 itself is served from `cdn.pixabay.com` and downloads
with a browser user agent and a pixabay.com referer.
