import sys
import os
import json
import base64
from urllib import request

def main():
    host = os.environ.get('WRITETEX_HOST', 'localhost')
    port = int(os.environ.get('WRITETEX_PORT', '53421'))
    token = os.environ.get('WRITETEX_TOKEN', '')
    image_path = os.environ.get('WRITETEX_IMAGE', os.path.join('example7.png'))
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    with open(image_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    body = { 'imageBase64': 'data:image/png;base64,' + b64 }
    if token:
        body['token'] = token
    data = json.dumps(body).encode('utf-8')
    url = f'http://{host}:{port}/ocr'
    req = request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with request.urlopen(req) as resp:
        print(resp.read().decode('utf-8'))

if __name__ == '__main__':
    main()

