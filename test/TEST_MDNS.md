# Test mDNS Service Discovery

## Requirements

Install zeroconf library:
```bash
pip install zeroconf
```

## Usage

1. **Start the WriteTex extension** in VSCode:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `WriteTex: Start OCR Server`
   - Verify server started (check status bar)

2. **Run the discovery script**:
   ```bash
   cd test
   python test_mdns.py
   ```

3. **Expected Output**:
   ```
   Searching for WriteTex services on local network...
   Press Ctrl+C to stop

   ✅ Found WriteTex Service:
     Name: WriteTex VSCode._writetex-vscode._tcp.local.
     Address: 192.168.x.x
     Port: 50905
     Properties:
       path: /v1/chat/completions
   
   ✅ Found 1 service(s)
   ```

## Troubleshooting

### No services found?

1. **Check extension status**:
   - Look for "WriteTex" in VSCode status bar
   - Try stopping and starting the server

2. **Check Windows Firewall**:
   - mDNS uses UDP port 5353
   - May need to allow in firewall

3. **Check local network**:
   - mDNS only works on local network
   - Won't work across VLANs or subnets

4. **Run as Administrator** (Windows):
   - Some systems require admin rights for mDNS

### Alternative: Manual test with DNS-SD (Windows)

If you have Bonjour service installed:
```bash
dns-sd -B _writetex-vscode._tcp
```

### Alternative: Use Avahi (Linux/Mac)

```bash
avahi-browse -r _writetex-vscode._tcp
```

## How mDNS Works

The extension advertises:
- **Service Type**: `_writetex-vscode._tcp.local.`
- **Service Name**: `WriteTex VSCode`
- **Port**: `50905`
- **TXT Record**: `path=/v1/chat/completions`

Clients can discover this automatically on the local network without configuration.
