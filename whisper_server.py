from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import tempfile
import base64
from urllib.parse import parse_qs, urlparse

# Try to import faster-whisper, provide clear error if not installed
try:
    from faster_whisper import WhisperModel
except ImportError:
    print("Error: faster-whisper is not installed. Please install it with:")
    print("pip install faster-whisper")
    exit(1)

# Initialize the model (small model by default)
model_size = "small"
# Run on GPU if available
compute_type = "auto"

try:
    model = WhisperModel(model_size, device="auto", compute_type=compute_type)
    print(f"Loaded faster-whisper model: {model_size}")
except Exception as e:
    print(f"Error loading model: {e}")
    exit(1)

class WhisperHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path.startswith("/transcribe"):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                
                # Check if audio data is provided
                if 'audio' not in data:
                    self.send_error(400, "Missing audio data")
                    return
                
                # Get audio data from base64
                audio_data = base64.b64decode(data['audio'])
                
                # Get language if provided, otherwise auto-detect
                language = data.get('language', None)
                
                # Create a temporary file for the audio
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                    temp_filename = temp_file.name
                    temp_file.write(audio_data)
                
                try:
                    # Transcribe the audio
                    segments, info = model.transcribe(
                        temp_filename, 
                        language=language,
                        beam_size=5,
                        vad_filter=True
                    )
                    
                    # Collect the segments
                    result = []
                    for segment in segments:
                        result.append({
                            "start": segment.start,
                            "end": segment.end,
                            "text": segment.text.strip()
                        })
                    
                    # Prepare the response
                    response = {
                        "text": " ".join([segment["text"] for segment in result]),
                        "segments": result,
                        "language": info.language,
                        "language_probability": info.language_probability
                    }
                    
                    # Send the response
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(response, indent=4).encode("utf-8"))
                    
                finally:
                    # Clean up the temporary file
                    if os.path.exists(temp_filename):
                        os.unlink(temp_filename)
                        
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
            except Exception as e:
                self.send_error(500, f"Error processing audio: {str(e)}")
        
        elif self.path.startswith("/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": model_size}).encode("utf-8"))
        
        else:
            self.send_error(404, "Not Found")
    
    def do_GET(self):
        if self.path.startswith("/health"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": model_size}).encode("utf-8"))
        else:
            self.send_error(404, "Not Found")

if __name__ == "__main__":
    server_address = ("localhost", 8081)  # Using port 8081 to avoid conflict with file finder server
    httpd = HTTPServer(server_address, WhisperHandler)
    print("Whisper STT сервис запущен на http://localhost:8081")
    httpd.serve_forever()