"""
Test script to discover WriteTex mDNS services on the local network
Requires: pip install zeroconf
"""
from zeroconf import ServiceBrowser, Zeroconf
import time

class WriteTexListener:
    def __init__(self):
        self.services = []
    
    def remove_service(self, zeroconf, type, name):
        print(f"Service {name} removed")
    
    def add_service(self, zeroconf, type, name):
        info = zeroconf.get_service_info(type, name)
        if info:
            print(f"\n✅ Found WriteTex Service:")
            print(f"  Name: {name}")
            print(f"  Address: {'.'.join(map(str, info.addresses[0]))}")
            print(f"  Port: {info.port}")
            print(f"  Properties:")
            for key, value in info.properties.items():
                print(f"    {key.decode()}: {value.decode()}")
            self.services.append(info)
    
    def update_service(self, zeroconf, type, name):
        print(f"Service {name} updated")

def main():
    print("Searching for WriteTex services on local network...")
    print("Press Ctrl+C to stop\n")
    
    zeroconf = Zeroconf()
    listener = WriteTexListener()
    
    # The service type should match what's published in mdns.ts
    service_type = "_writetex-vscode._tcp.local."
    
    browser = ServiceBrowser(zeroconf, service_type, listener)
    
    try:
        # Wait and listen for services
        time.sleep(5)
        
        if not listener.services:
            print("\n❌ No WriteTex services found")
            print("\nTroubleshooting:")
            print("1. Make sure the WriteTex extension is running in VSCode")
            print("2. Check that the server has started (Command: 'WriteTex: Start OCR Server')")
            print("3. Verify firewall isn't blocking mDNS/port 5353")
            print("4. Try running this script with administrator privileges")
        else:
            print(f"\n✅ Found {len(listener.services)} service(s)")
            
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        zeroconf.close()

if __name__ == '__main__':
    main()
