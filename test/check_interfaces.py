"""
Debug script to check what network interfaces are available
and which one WriteTex should use
"""
import socket
import subprocess

def get_network_interfaces():
    """Get all IPv4 addresses on this machine"""
    result = subprocess.run(['ipconfig'], capture_output=True, text=True)
    print(result.stdout)
    print("\n" + "="*60)
    print("Python socket detection:")
    print("="*60)
    
    hostname = socket.gethostname()
    print(f"Hostname: {hostname}")
    
    # Get all IP addresses
    try:
        ips = socket.getaddrinfo(hostname, None, socket.AF_INET)
        for ip in ips:
            addr = ip[4][0]
            print(f"  IPv4: {addr}")
    except:
        pass

if __name__ == '__main__':
    get_network_interfaces()
