# pete-tong-voice-pipeline

Automated pipeline to extract clean Pete Tong speech samples from DJ sets and radio shows, ready for [ElevenLabs](https://elevenlabs.io) Professional Voice Cloning.

Part of the [PeteTongIsAI.com](https://petetongisai.com) fan project.

## Pipeline

```
YouTube / Mixcloud
      │
      ▼ yt-dlp
   Download MP3
      │
      ▼ Demucs htdemucs
   Separate vocals from music bed
      │
      ▼ pyannote.audio 3.1
   Speaker diarisation
      │
      ▼ OpenAI Whisper
   Transcribe each segment
      │
      ▼ librosa SNR filter
   Discard music-bleed clips
      │
      ▼
   WAV clips + manifest JSON
      │
      ▼ ElevenLabs
   Train Pete Tong voice clone
```

## Requirements

- Python 3.10+
- ffmpeg (`brew install ffmpeg` / `apt install ffmpeg`)
- GPU recommended (CUDA 12.x) — CPU works but Demucs + Whisper are slow

## Installation

```bash
git clone https://github.com/your-username/pete-tong-voice-pipeline
cd pete-tong-voice-pipeline

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# GPU (CUDA 12.1)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# CPU only
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

pip install -e ".[dev]"
```

## HuggingFace setup (required for diarisation)

pyannote's models are gated — you need to accept their terms before they'll download.

1. Create an account at https://huggingface.co
2. Accept terms for both models:
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/segmentation-3.0
3. Get your token: https://huggingface.co/settings/tokens (Read scope)
4. Add it to your `.env`:

```bash
cp .env.example .env
# edit .env and set HF_TOKEN=hf_xxxxxxxxxxxx
```

## Usage

### 1. Find source URLs

```bash
pt-find-sources --max 20
```

Searches YouTube and Mixcloud for long-form Pete Tong shows (>30 min), saves `sources_found.json`, and prints a `SOURCES[]` block you can paste into `src/pete_tong_pipeline/sources.py`.

### 2. Run the pipeline

```bash
# Using built-in SOURCES list
pt-extract

# Or pass the JSON from pt-find-sources
pt-extract --sources sources_found.json

# All options
pt-extract \
  --hf-token hf_xxx \        # or set HF_TOKEN in .env
  --speaker SPEAKER_00 \     # override auto-detected speaker
  --whisper-model large \    # tiny/base/small/medium/large
  --snr 15.0 \               # stricter quality gate
  --output-dir ./samples
```

### 3. Check progress

```bash
pt-report
```

### 4. Upload to ElevenLabs

Once you have 30+ minutes:

1. ElevenLabs → Voices → Add Voice → **Professional Voice Clone**
2. Upload all `.wav` files from `pete_tong_samples/clips/`
3. The `*_manifest.json` files contain transcripts — supply them for better accuracy

## Configuration

All settings can be set via environment variables (in `.env`) or CLI flags.

| Env var | CLI flag | Default | Description |
|---|---|---|---|
| `HF_TOKEN` | `--hf-token` | — | HuggingFace token (required) |
| `PT_OUTPUT_DIR` | `--output-dir` | `./pete_tong_samples` | Output root |
| `PT_WHISPER_MODEL` | `--whisper-model` | `medium` | Whisper model size |
| `PT_MIN_SNR_DB` | `--snr` | `12.0` | Min speech SNR to keep a clip |
| `PT_MIN_CLIP_S` | — | `5` | Min clip duration (seconds) |
| `PT_MAX_CLIP_S` | — | `120` | Max clip before splitting |
| `PT_TARGET_CLIP_S` | — | `45` | Target chunk size for splits |
| `PT_DEMUCS_MODEL` | — | `htdemucs` | Demucs model variant |

## Output structure

```
pete_tong_samples/
├── raw/                        # Downloaded MP3s
├── separated/htdemucs/         # Demucs output
├── resampled/                  # 16kHz mono WAV
├── diarisation/                # Speaker segment JSON
├── transcripts/                # Whisper transcript JSON
└── clips/
    ├── <label>/                # WAV clips per source
    │   ├── <label>_0001.wav
    │   └── ...
    └── <label>_manifest.json   # Duration, transcript, SNR per clip
```

## Best sources

Shows with the most Pete speech (prioritise these):

| Type | Why |
|---|---|
| Essential Mix NYE specials | Long monologues between tracks |
| Essential Selection archive (early 2000s) | Very talkative era |
| Pete Tong & Friends shows | Interview segments = isolated clean voice |
| Defected Radio episodes | Conversational, minimal music bed |
| Ibiza Classics live sets | Rich commentary throughout |

**Avoid:** Pure mix recordings with no speech breaks.

## Running on Google Colab

If you don't have a local GPU, Colab's free tier handles the full pipeline on a few shows:

```python
!pip install -q pete-tong-voice-pipeline torch demucs pyannote.audio openai-whisper
import os
os.environ["HF_TOKEN"] = "hf_xxx"  # use Colab Secrets

!pt-extract --sources sources_found.json --whisper-model medium
```

Mount your Google Drive to persist output between sessions.

## Development

```bash
pip install -e ".[dev]"
pytest
```

## Notes

This is a personal fan project with no commercial intent. BBC content is for personal, non-commercial use only. ElevenLabs' terms require consent for voice cloning of real people — this project is for educational/fan use only.
