"""Synthesize one text to a 24 kHz mono WAV with Kokoro-82M (Hugging Face hexgrad/Kokoro-82M).
Usage: kokoro_say.py VOICE SPEED OUT.wav < text"""
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

voice, speed, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
text = sys.stdin.read().strip()
pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
chunks = [audio.numpy() for _, _, audio in pipeline(text, voice=voice, speed=speed)]
sf.write(out, np.concatenate(chunks), 24000)
