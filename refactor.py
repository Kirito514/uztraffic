import os
import shutil
from pathlib import Path

def refactor_project():
    root = Path(__file__).parent
    src = root / "src"
    
    # Create new dirs
    (src / "api").mkdir(exist_ok=True)
    (src / "ai").mkdir(exist_ok=True)
    (src / "services").mkdir(exist_ok=True)
    (src / "core").mkdir(exist_ok=True)
    
    # Define moves
    moves = [
        (src / "models" / "nlp_bot.py", src / "ai" / "nlp_bot.py"),
        (src / "models" / "recommender.py", src / "ai" / "recommender.py"),
        (src / "models" / "congestion_predictor.py", src / "ai" / "congestion_predictor.py"),
        (src / "models" / "traffic_analyzer.py", src / "services" / "traffic_analyzer.py"),
        (src / "models" / "signal_optimizer.py", src / "services" / "signal_optimizer.py"),
        (src / "emergency" / "evp_controller.py", src / "services" / "evp_controller.py"),
        (src / "server" / "main.py", src / "api" / "main.py"),
    ]
    
    print("Ko'chirilayotgan fayllar:")
    for old_path, new_path in moves:
        if old_path.exists():
            shutil.move(str(old_path), str(new_path))
            print(f"✅ {old_path.name} -> {new_path.parent.name}/{new_path.name}")
        else:
            print(f"⚠️ Topilmadi (balki ko'chirilgan): {old_path.name}")
            
    # Clean up empty dirs
    print("\nKeraksiz papkalarni tozalash:")
    for old_dir in ["models", "emergency", "server"]:
        dir_path = src / old_dir
        if dir_path.exists() and not any(dir_path.iterdir()):
            dir_path.rmdir()
            print(f"🗑️ O'chirildi: {old_dir}/")
        elif dir_path.exists():
            # Agar ichida __pycache__ yoki __init__.py bo'lsa
            for item in dir_path.iterdir():
                if item.is_dir():
                    shutil.rmtree(str(item))
                else:
                    item.unlink()
            dir_path.rmdir()
            print(f"🗑️ O'chirildi: {old_dir}/")

if __name__ == "__main__":
    print("🔄 OQIM AI: Arxitekturani yangilash (Clean Architecture)...\n")
    refactor_project()
    print("\n🎉 Refactoring muvaffaqiyatli tugallandi!")
    print("Endi odatdagidek 'python run.py' orqali loyihani ishga tushirishingiz mumkin.")
