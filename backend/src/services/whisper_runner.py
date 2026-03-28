"""
Whisper Transcription Runner — Enhanced with Word-Level Timestamps

Standalone Python script that transcribes an audio file using OpenAI Whisper (local).
Called by the Node.js backend as a subprocess.

Enhanced for Phase 4 Feature 8: Returns word-level timestamps for audio playback mapping.

Usage:
    python whisper_runner.py <audio_file_path> [model_name]

Output:
    JSON to stdout: {
      "text": "...",
      "language": "...",
      "duration": ...,
      "segments": [...],
      "words": [{"word": "...", "start": 0.0, "end": 0.5}, ...]
    }
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

    # Transcribe with word-level timestamps enabled
    # The initial_prompt is tuned for Indian vendor contexts and Hinglish
    result = model.transcribe(
        audio_path,
        language="hi",
        word_timestamps=True,  # Phase 4 Feature 8: Enable word-level timestamps
        initial_prompt=(
            "Street vendor daily sales report in Hindi, English, or Hinglish (mixed). "
            "Common items: samosa, vada pav, chai, gola, paan, biryani, juice, lassi, "
            "pakora, poha, idli, dosa, momos, chaat, pani puri, bhel, jalebi, kulfi, "
            "fruits like kela banana, seb apple, aam mango, santra orange. "
            "Numbers and prices: rupaye, rupees, Rs, paisa. "
            "Expenses: tel oil, aata flour, cheeni sugar, gas, rent, auto, transport. "
            "Casual filler words: haan, toh, matlab, basically, like, aur, phir."
        ),
        verbose=False,
    )

    duration_ms = int((time.time() - start_time) * 1000)

    # Detect language from text
    text = result.get("text", "")
    total_chars = len(text.replace(" ", "")) or 1
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')

    if hindi_chars / total_chars > 0.3:
        detected_language = "hi"
    elif hindi_chars / total_chars > 0.05:
        detected_language = "hinglish"
    else:
        detected_language = "en"

    # Build segments (sentence-level)
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start": round(seg.get("start", 0), 2),
            "end": round(seg.get("end", 0), 2),
            "text": seg.get("text", "").strip(),
        })

    # Build word-level timestamps (Phase 4 Feature 8)
    words = []
    for seg in result.get("segments", []):
        for word_info in seg.get("words", []):
            words.append({
                "word": word_info.get("word", "").strip(),
                "start": round(word_info.get("start", 0), 3),
                "end": round(word_info.get("end", 0), 3),
            })

    output = {
        "text": text,
        "language": detected_language,
        "duration": duration_ms,
        "segments": segments,
        "words": words,  # word-level timestamps for audio playback mapping
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()
