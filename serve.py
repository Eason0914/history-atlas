"""Optional local server. The atlas also runs by opening index.html directly."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import argparse, webbrowser

def main():
    parser=argparse.ArgumentParser(description='Run your offline classroom history atlas.')
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--no-open',action='store_true')
    args=parser.parse_args()
    root=Path(__file__).resolve().parent
    address=f'http://127.0.0.1:{args.port}'
    try:
        server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(root)))
    except OSError as exc:
        raise SystemExit(f'Cannot use port {args.port}: {exc}. Try --port 8766.')
    print(f'Atlas running at {address}. Press Ctrl+C to stop.',flush=True)
    if not args.no_open: webbrowser.open(address)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
