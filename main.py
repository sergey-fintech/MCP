from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import json
import time

class MCPHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/search?"):
            query = self.path.split("?")[1]
            param = dict(q.split("=") for q in query.split("&"))
            fragment = param.get("q", "")
            
            if fragment:
                results = self.search_files(fragment)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(results, indent=4).encode("utf-8"))
            else:
                self.send_error(400, "Missing query parameter: q")
        else:
            self.send_error(404, "Not Found")
    
    def search_files(self, fragment):
        results = []
        for root, _, files in os.walk("."):
            for file in files:
                if fragment in file:
                    file_path = os.path.join(root, file)
                    file_stat = os.stat(file_path)
                    results.append({
                        "name": file,
                        "path": os.path.abspath(file_path),
                        "size": file_stat.st_size,
                        "created": time.ctime(file_stat.st_ctime)
                    })
        return results

if __name__ == "__main__":
    server_address = ("localhost", 8080)
    httpd = HTTPServer(server_address, MCPHandler)
    print("MCP сервис запущен на http://localhost:8080")
    httpd.serve_forever()