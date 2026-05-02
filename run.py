"""
🚦 OQIM AI — Asosiy ishga tushirish fali

Faqat bitta buyruq bilan serverni ishga tushiradi:
    python run.py
"""

import sys
import os
import time
from pathlib import Path

# Loyiha root papkasi
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def print_banner():
    banner = f"""
{Colors.CYAN}╔══════════════════════════════════════════════════════════════╗
║     {Colors.YELLOW}🚦 OQIM AI - AQLLI SHAHAR BOSHQARUVI (OSM) 🚦{Colors.CYAN}            ║
║                                                              ║
║  {Colors.GREEN}Haqiqiy Yo'llar{Colors.CYAN} │ {Colors.GREEN}AI Tahlil{Colors.CYAN} │ {Colors.GREEN}Svetofor Optimallashtirish{Colors.CYAN}    ║
╚══════════════════════════════════════════════════════════════╝{Colors.RESET}
"""
    print(banner)

def run_server():
    print(f"\n{Colors.YELLOW}🚀 Server ishga tushmoqda...{Colors.RESET}")
    
    try:
        import uvicorn
        from src.api.main import app
        
        print(f"   {Colors.CYAN}Dashboard:{Colors.RESET} http://localhost:8000")
        print(f"   {Colors.CYAN}GPS Tracker:{Colors.RESET} http://localhost:8000/gps")
        print(f"   {Colors.CYAN}API Hujjat:{Colors.RESET} http://localhost:8000/docs\n")
        
        print(f"{Colors.YELLOW}⚠️  ESLATMA: Agar birinchi marta bo'lsa, OSM ma'lumotlari 1-3 daqiqa yuklanadi.{Colors.RESET}\n")
        
        uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=False, log_level="info")
        
    except ImportError as e:
        print(f"{Colors.RED}❌ Kutubxona yetishmayapti: {e}{Colors.RESET}")
        print(f"Iltimos o'rnating: pip install -r requirements.txt")
    except Exception as e:
        print(f"{Colors.RED}❌ Xato: {e}{Colors.RESET}")

if __name__ == "__main__":
    os.system('color')
    print_banner()
    try:
        run_server()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}👋 Xayr! Server to'xtatildi.{Colors.RESET}\n")
        sys.exit(0)
