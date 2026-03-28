"""
Whisper Transcription Runner

Standalone Python script that transcribes an audio file using OpenAI Whisper (local).
Called by the Node.js backend as a subprocess.

Usage:
    python whisper_runner.py <audio_file_path> [model_name]

Output:
    JSON to stdout: { "text": "...", "language": "...", "duration": ..., "segments": [...] }
"""

import sys
import json
import time
import os

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python whisper_runner.py <audio_file> [model]"}), file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found: {audio_path}"}), file=sys.stderr)
        sys.exit(1)

    try:
        import whisper
    except ImportError:
        print(json.dumps({"error": "openai-whisper not installed. Run: pip install openai-whisper"}), file=sys.stderr)
        sys.exit(1)

    start_time = time.time()

    # Load model (cached after first call)
    model = whisper.load_model(model_name)

    # Transcribe with Hindi language hint (works well for Hinglish too)
    result = model.transcribe(
        audio_path,
        language="hi",
        initial_prompt="Street vendor sales report in Hindi/Hinglish. Items sold, prices, quantities, expenses. "
                       "Words like samosa, vada pav, chai, gola, paan, biryani, juice, lassi, pakora.",
        verbose=False,
    )

    duration_ms = int((time.time() - start_time) * 1000)

    # Detect language from text (same logic as original Node.js)
    text = result.get("text", "")
    total_chars = len(text.replace(" ", "")) or 1
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')

    if hindi_chars / total_chars > 0.3:
        detected_language = "hi"
    elif hindi_chars / total_chars > 0.05:
        detected_language = "hinglish"
    else:
        detected_language = "en"

    # Build segments
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start": seg.get("start", 0),
            "end": seg.get("end", 0),
            "text": seg.get("text", ""),
        })

    output = {
        "text": text,
        "language": detected_language,
        "duration": duration_ms,
        "segments": segments,
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
