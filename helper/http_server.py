from http.server import HTTPServer, SimpleHTTPRequestHandler

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        SimpleHTTPRequestHandler.end_headers(self)

server = HTTPServer(('localhost', 8000), CORSRequestHandler)
print("Serving at http://localhost:8000")
server.serve_forever()