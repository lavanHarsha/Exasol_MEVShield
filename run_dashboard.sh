#!/bin/bash
# ===================================================
#   Launch MEVShield Backend & Frontend Demo
#   Compatible with macOS and Linux
# ===================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==================================================="
echo "    Starting MEVShield Backend & Frontend Demo"
echo "==================================================="

# 1. Start FastAPI Backend in background
echo "[1/2] Launching FastAPI Backend on http://localhost:8000 ..."
cd "$SCRIPT_DIR/backend"
python3 main.py &
BACKEND_PID=$!

# 2. Start React Frontend in background
echo "[2/2] Launching React Vite Frontend on http://localhost:5173 ..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 3

# 3. Open browser automatically depending on OS
echo "Opening Dashboard in your browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173 2>/dev/null || sensible-browser http://localhost:5173 2>/dev/null || true
fi

echo ""
echo "==================================================="
echo "  MEVShield is LIVE!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Press Ctrl+C to terminate both servers"
echo "==================================================="

# Trap SIGINT to kill background processes cleanly
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
