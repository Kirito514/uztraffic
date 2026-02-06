#!/bin/bash

# UzTraffic - Development Server Starter
# Frontend (Vite) va Backend (FastAPI) ni bitta buyruq bilan ishga tushiradi.

echo "🚦 UzTraffic tizimini ishga tushirish..."

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Eski jarayonlarni to'xtatish
echo "→ Eski jarayonlarni to'xtatish..."
pkill -f "run.py --server-only" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 1

# Backend (FastAPI) ishga tushirish
echo "→ Backend serverni ishga tushirish (port 8000)..."
./venv/bin/python run.py --server-only &
BACKEND_PID=$!
sleep 2

# Frontend (Vite) ishga tushirish
echo "→ Frontend ishga tushirish (port 5173)..."
cd frontend && npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "✅ Tizim muvaffaqiyatli ishga tushdi!"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend:  http://localhost:8000"
echo "   • Dashboard: http://localhost:5173/dashboard"
echo ""
echo "To'xtatish uchun: Ctrl+C"

# Ctrl+C bosilganda barcha jarayonlarni to'xtatish
trap "echo '⏹️ To'xtatilmoqda...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Jarayonlar ishlab turguncha kutish
wait
