# Troubleshooting mDNS Network Discovery

## Current Situation

The service is advertising on **172.19.144.1** (Hyper-V virtual switch), but you want it on your **10.x.x.x** network.

## Root Cause

Windows systems with Hyper-V/WSL2/Docker often have multiple network adapters, and `bonjour-service` picks the first available one, which is often the virtual adapter.

## Solutions

### Option 1: Disable Virtual Network Adapter (Temporary)

Temporarily disable the virtual adapter to force mDNS to use your main network:

1. Open **Network Connections** (`ncpa.cpl`)
2. Find "vEthernet (Default Switch)" or similar
3. Right-click → Disable
4. Restart WriteTex server
5. Test mDNS discovery
6. Re-enable after testing

### Option 2: Use Windows Firewall to Allow mDNS

Ensure mDNS (UDP port 5353) is allowed on your main network:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "mDNS" -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow
New-NetFirewallRule -DisplayName "mDNS" -Direction Outbound -Protocol UDP -LocalPort 5353 -Action Allow
```

### Option 3: Manual Discovery (Workaround)

Instead of mDNS, manually configure clients with your machine's IP:

1. Find your IP on the 10.x network:
   ```powershell
   ipconfig | findstr /C:"IPv4" /C:"10."
   ```

2. Configure clients to use:
   ```
   http://10.x.x.x:50905/v1/chat/completions
   ```

### Option 4: Use Different mDNS Library (Complex)

Replace `bonjour-service` with a library that supports interface selection, such as:
- `mdns` (unmaintained but has better control)
- `dnssd` (native bindings)
- `avahi` (Linux/cross-platform)

## Quick Test

Check if the server is accessible on your 10.x network:

```bash
# From another device on 10.x network
curl http://10.x.x.x:50905/health
```

If this works, the server is fine - it's just mDNS advertising on the wrong interface.

## Recommended Approach

**For Development**: Use Option 3 (manual IP configuration)
**For Production**: Consider using a proper service discovery mechanism or configure firewall rules (Option 2)
