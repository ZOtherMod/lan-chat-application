#!/usr/bin/env python3
"""
Server Discovery Utility
A simple utility to discover LAN Chat servers on the network
"""

import requests
import socket
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

class ServerDiscovery:
    def __init__(self):
        self.found_servers = []
        self.timeout = 2
        
    def check_server_at_ip(self, ip):
        """Check if there's a LAN Chat server at the given IP"""
        try:
            url = f"http://{ip}:8766/discover"
            response = requests.get(url, timeout=self.timeout)
            if response.status_code == 200:
                server_info = response.json()
                server_info['ip'] = ip
                return server_info
        except:
            pass
        return None
    
    def get_network_ranges(self):
        """Get common network IP ranges to scan"""
        try:
            # Get local IP to determine network range
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                
            # Extract network prefix
            parts = local_ip.split('.')
            base = f"{parts[0]}.{parts[1]}.{parts[2]}"
            return [base]
        except:
            # Fallback to common ranges
            return ['192.168.1', '192.168.0', '10.0.0', '172.16.0']
    
    def scan_network(self, progress_callback=None):
        """Scan the network for LAN Chat servers"""
        print("🔍 Scanning network for LAN Chat servers...")
        self.found_servers = []
        
        ranges = self.get_network_ranges()
        total_ips = len(ranges) * 254
        checked = 0
        
        with ThreadPoolExecutor(max_workers=50) as executor:
            futures = []
            
            for base_ip in ranges:
                for i in range(1, 255):
                    ip = f"{base_ip}.{i}"
                    future = executor.submit(self.check_server_at_ip, ip)
                    futures.append(future)
            
            for future in as_completed(futures):
                checked += 1
                if progress_callback:
                    progress_callback(checked, total_ips)
                    
                result = future.result()
                if result:
                    self.found_servers.append(result)
                    print(f"✅ Found server: {result['name']} at {result['ip']}")
        
        return self.found_servers
    
    def find_server_by_name(self, server_name):
        """Find a specific server by name"""
        print(f"🔍 Looking for server '{server_name}'...")
        
        ranges = self.get_network_ranges()
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = []
            
            for base_ip in ranges:
                for i in range(1, 255):
                    ip = f"{base_ip}.{i}"
                    future = executor.submit(self.check_server_at_ip, ip)
                    futures.append(future)
            
            for future in as_completed(futures):
                result = future.result()
                if result:
                    if (result['name'].lower() == server_name.lower() or 
                        result['hostname'].lower() == server_name.lower()):
                        print(f"✅ Found '{server_name}' at {result['ip']}")
                        return result
        
        print(f"❌ Server '{server_name}' not found")
        return None

def main():
    print("=" * 50)
    print("🌐 LAN Chat Server Discovery")
    print("=" * 50)
    
    discovery = ServerDiscovery()
    
    while True:
        print("\nOptions:")
        print("1. Scan for all servers")
        print("2. Find server by name")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
            def progress(checked, total):
                percent = (checked / total) * 100
                print(f"\rProgress: {checked}/{total} ({percent:.1f}%)", end='', flush=True)
            
            servers = discovery.scan_network(progress)
            print(f"\n\n📋 Found {len(servers)} server(s):")
            
            if servers:
                for i, server in enumerate(servers, 1):
                    print(f"  {i}. {server['name']} ({server['hostname']})")
                    print(f"     Platform: {server['platform']}")
                    print(f"     Address: {server['ws_url']}")
                    print()
            else:
                print("  No servers found on the network.")
                
        elif choice == '2':
            server_name = input("Enter server name: ").strip()
            if server_name:
                server = discovery.find_server_by_name(server_name)
                if server:
                    print(f"\n📋 Server Details:")
                    print(f"  Name: {server['name']}")
                    print(f"  Hostname: {server['hostname']}")
                    print(f"  Platform: {server['platform']}")
                    print(f"  WebSocket URL: {server['ws_url']}")
                    print(f"  IP Address: {server['ip']}")
                    
        elif choice == '3':
            print("👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Scan interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")