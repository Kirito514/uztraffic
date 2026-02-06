"""
🚦 Aqlli Shahar Trafik Boshqaruv Tizimi
Bitta buyruq bilan hammasi ishga tushadi!

Ishlatish:
    python run.py          - Oddiy rejim
    python run.py --demo   - Demo rejim (serverssiz)
    python run.py --test   - Testlarni ishga tushirish
"""

import sys
import os
import threading
import webbrowser
import time
import argparse
from pathlib import Path

# Loyiha root papkasi
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

# Ranglar (Windows terminal uchun)
os.system('color')

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_banner():
    """Logo ko'rsatish"""
    banner = f"""
{Colors.CYAN}╔══════════════════════════════════════════════════════════════╗
║     {Colors.YELLOW}🚦 AQLLI SHAHAR TRAFIK BOSHQARUV TIZIMI 🚦{Colors.CYAN}              ║
║                                                              ║
║  {Colors.GREEN}GPS Kuzatuv{Colors.CYAN} │ {Colors.GREEN}AI Bashorat{Colors.CYAN} │ {Colors.GREEN}Svetofor Optimallashtirish{Colors.CYAN}  ║
║                                                              ║
║  {Colors.BLUE}Maxsus Transport Ustuvorligi (EVP) - Tez yordam uchun{Colors.CYAN}      ║
╚══════════════════════════════════════════════════════════════╝{Colors.RESET}
"""
    print(banner)


def check_dependencies():
    """Bog'liqliklari tekshirish"""
    print(f"\n{Colors.YELLOW}📦 Bog'liqliklar tekshirilmoqda...{Colors.RESET}")
    
    required = ['fastapi', 'uvicorn', 'pydantic']
    optional = ['paho.mqtt', 'numpy', 'sklearn']
    
    missing = []
    
    for pkg in required:
        try:
            __import__(pkg.replace('.', '_').replace('-', '_'))
            print(f"  {Colors.GREEN}✓{Colors.RESET} {pkg}")
        except ImportError:
            print(f"  {Colors.RED}✗{Colors.RESET} {pkg}")
            missing.append(pkg)
    
    if missing:
        print(f"\n{Colors.RED}❌ Kerakli kutubxonalar yo'q!{Colors.RESET}")
        print(f"\nQuyidagini ishga tushiring:")
        print(f"  {Colors.CYAN}pip install -r requirements.txt{Colors.RESET}")
        return False
    
    print(f"\n{Colors.GREEN}✅ Barcha bog'liqliklar mavjud!{Colors.RESET}")
    return True


def run_tests():
    """Testlarni ishga tushirish"""
    print(f"\n{Colors.YELLOW}🧪 Testlar ishga tushmoqda...{Colors.RESET}\n")
    
    try:
        from tests.test_all import run_all_tests
        success = run_all_tests()
        return success
    except Exception as e:
        print(f"{Colors.RED}❌ Test xatosi: {e}{Colors.RESET}")
        return False


def run_simulation_demo(duration=60):
    """Faqat simulyatsiya (serverssiz)"""
    print(f"\n{Colors.YELLOW}🏙️ Simulyatsiya ishga tushmoqda...{Colors.RESET}")
    print(f"   Davomiylik: {duration} sekund\n")
    
    try:
        from src.simulation.city_simulator import CitySimulator, SimulationConfig
        
        config = SimulationConfig(
            vehicle_count=100,
            emergency_vehicle_count=5,
            grid_size=5
        )
        
        simulator = CitySimulator(config)
        simulator.setup()
        
        print(f"\n{Colors.GREEN}▶️  Simulyatsiya boshlandi!{Colors.RESET}")
        print(f"   {Colors.CYAN}Ctrl+C{Colors.RESET} bilan to'xtatish mumkin\n")
        
        for i in range(duration):
            result = simulator.step()
            
            # Progress bar
            progress = int((i / duration) * 30)
            bar = '█' * progress + '░' * (30 - progress)
            
            print(f"\r  [{bar}] {i+1}/{duration}s | "
                  f"🚗 {result['vehicles']} | "
                  f"⚡ {result['average_speed']:.1f} km/h | "
                  f"📊 {result['average_congestion']:.0f}%", end='')
            
            time.sleep(1)
        
        print(f"\n\n{Colors.GREEN}✅ Simulyatsiya tugadi!{Colors.RESET}")
        
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⏹️ Simulyatsiya to'xtatildi{Colors.RESET}")
    except Exception as e:
        print(f"\n{Colors.RED}❌ Xato: {e}{Colors.RESET}")


def run_server():
    """API serverni ishga tushirish"""
    print(f"\n{Colors.YELLOW}🚀 Server ishga tushmoqda...{Colors.RESET}")
    
    try:
        import uvicorn
        from src.server.main import app
        
        print(f"   {Colors.CYAN}http://localhost:8000{Colors.RESET}")
        print(f"   {Colors.CYAN}http://localhost:8000/docs{Colors.RESET} (API hujjati)\n")
        
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
        
    except Exception as e:
        print(f"{Colors.RED}❌ Server xatosi: {e}{Colors.RESET}")


def open_dashboard():
    """Dashboard'ni brauzerda ochish"""
    time.sleep(2)  # Server ishga tushguncha kutish
    
    dashboard_path = ROOT_DIR / "web" / "index.html"
    
    if dashboard_path.exists():
        print(f"\n{Colors.GREEN}🌐 Dashboard ochilmoqda...{Colors.RESET}")
        webbrowser.open(f"file:///{dashboard_path}")
    else:
        print(f"\n{Colors.YELLOW}⚠️ Dashboard topilmadi: {dashboard_path}{Colors.RESET}")


def run_full_system():
    """To'liq tizimni ishga tushirish"""
    print(f"\n{Colors.GREEN}🎯 TO'LIQ TIZIM ISHGA TUSHMOQDA{Colors.RESET}")
    print("="*50)
    
    # 1. Dashboard ochish (alohida thread)
    dashboard_thread = threading.Thread(target=open_dashboard, daemon=True)
    dashboard_thread.start()
    
    # 2. Server (asosiy thread)
    print(f"\n{Colors.CYAN}📝 Yo'riqnoma:{Colors.RESET}")
    print(f"   1. Dashboard brauzerda ochiladi")
    print(f"   2. Server http://localhost:8000 da ishlaydi")
    print(f"   3. {Colors.YELLOW}Ctrl+C{Colors.RESET} bilan to'xtatish\n")
    
    run_server()


def main():
    """Asosiy funksiya"""
    parser = argparse.ArgumentParser(
        description="🚦 Aqlli Shahar Trafik Boshqaruv Tizimi"
    )
    parser.add_argument('--demo', action='store_true', 
                        help='Demo rejim (serverssiz simulyatsiya)')
    parser.add_argument('--test', action='store_true',
                        help='Testlarni ishga tushirish')
    parser.add_argument('--server-only', action='store_true',
                        help='Faqat server (dashboardssiz)')
    parser.add_argument('--duration', type=int, default=60,
                        help='Demo davomiyligi (sekund)')
    
    args = parser.parse_args()
    
    # Banner
    print_banner()
    
    # Bog'liqliklar
    if not check_dependencies():
        sys.exit(1)
    
    # Rejim tanlash
    if args.test:
        success = run_tests()
        sys.exit(0 if success else 1)
    
    elif args.demo:
        run_simulation_demo(args.duration)
    
    elif args.server_only:
        run_server()
    
    else:
        # To'liq rejim: Server + Dashboard
        run_full_system()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}👋 Xayr!{Colors.RESET}\n")
        sys.exit(0)
