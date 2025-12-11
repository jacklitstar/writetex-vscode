"""
Test script for OpenAI-compatible proxy endpoint
"""
import sys
import os
import json
import base64
from urllib import request

def main():
    host = os.environ.get('WRITETEX_HOST', 'localhost')
    port = int(os.environ.get('WRITETEX_PORT', '50905'))
    image_path = os.environ.get('WRITETEX_IMAGE', 'example7.png')
    
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    
    # Read and encode image
    with open(image_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('ascii')
    
    # Construct OpenAI-compatible request
    openai_request = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract the LaTeX/math content from this image"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{b64}"
                        }
                    }
                ]
            }
        ],
        "stream": True
    }
    
    # Send to OpenAI-compatible endpoint
    data = json.dumps(openai_request).encode('utf-8')
    url = f'http://{host}:{port}/v1/chat/completions'
    
    # Add authentication token
    token = os.environ.get('WRITETEX_TOKEN', 'writetex')
    
    req = request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    })
    
    print(f"Sending request to {url}...")
    print("Streaming response:")
    print("-" * 60)
    
    with request.urlopen(req) as resp:
        # Read streaming response
        for line in resp:
            line = line.decode('utf-8').strip()
            if line.startswith('data: '):
                if line == 'data: [DONE]':
                    print("\n" + "-" * 60)
                    print("Stream complete!")
                    break
                try:
                    data = json.loads(line[6:])  # Remove 'data: ' prefix
                    if 'choices' in data:
                        content = data['choices'][0].get('delta', {}).get('content', '')
                        if content:
                            print(content, end='', flush=True)
                except json.JSONDecodeError:
                    pass

if __name__ == '__main__':
    main()
