#!/usr/bin/env python3
import sys
import os
import argparse
from typing import Optional, Tuple
import numpy as np
import torch

# Check if CUDA is available
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def load_audio(file_path: str) -> np.ndarray:
    """
    Load audio file using the appropriate library based on file extension.
    Returns the audio data as a numpy array.
    """
    try:
        # Try to import librosa first (handles more formats)
        import librosa
        audio_data, _ = librosa.load(file_path, sr=16000, mono=True)
        return audio_data
    except ImportError:
        # Fall back to scipy if librosa is not available
        try:
            from scipy.io import wavfile
            sample_rate, audio_data = wavfile.read(file_path)
            
            # Convert to mono if stereo
            if len(audio_data.shape) > 1:
                audio_data = np.mean(audio_data, axis=1)
            
            # Resample to 16kHz if needed
            if sample_rate != 16000:
                from scipy import signal
                audio_data = signal.resample(audio_data, int(len(audio_data) * 16000 / sample_rate))
            
            # Normalize to float between -1 and 1
            if audio_data.dtype == np.int16:
                audio_data = audio_data.astype(np.float32) / 32768.0
            elif audio_data.dtype == np.int32:
                audio_data = audio_data.astype(np.float32) / 2147483648.0
            
            return audio_data
        except ImportError:
            print("Error: Neither librosa nor scipy is available. Please install one of them.", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error loading audio file: {e}", file=sys.stderr)
            sys.exit(1)

def transcribe_audio(audio_file: str, model_size: str = "base") -> str:
    """
    Transcribe audio file using faster-whisper.
    
    Args:
        audio_file: Path to the audio file
        model_size: Size of the Whisper model to use (tiny, base, small, medium, large)
        
    Returns:
        Transcribed text
    """
    try:
        # Import faster-whisper
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            print("Error: faster-whisper is not installed. Please install it with 'pip install faster-whisper'.", file=sys.stderr)
            sys.exit(1)
        
        # Load the model
        try:
            model = WhisperModel(model_size, device=DEVICE, compute_type="float16" if DEVICE == "cuda" else "float32")
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            # Fall back to CPU if GPU loading fails
            model = WhisperModel(model_size, device="cpu", compute_type="float32")
        
        # Load audio
        audio_data = load_audio(audio_file)
        
        # Transcribe
        segments, info = model.transcribe(audio_data, beam_size=5, language="en")
        
        # Collect all segments
        transcript = " ".join([segment.text for segment in segments])
        
        return transcript.strip()
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        return f"Error: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="Transcribe audio file using faster-whisper")
    parser.add_argument("audio_file", help="Path to the audio file to transcribe")
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large"], 
                        help="Size of the Whisper model to use")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.audio_file):
        print(f"Error: Audio file '{args.audio_file}' does not exist.", file=sys.stderr)
        sys.exit(1)
    
    transcript = transcribe_audio(args.audio_file, args.model)
    print(transcript)

if __name__ == "__main__":
    main()