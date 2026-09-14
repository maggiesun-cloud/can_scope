#!/usr/bin/env bash
# ==============================================================================
# CANScope - All-In-One Local Setup Script
# Installs all Node.js and optional Python CAN dependencies from source in 1 step.
# ==============================================================================

set -e

echo ""
echo "========================================================"
echo " 🚗 CANScope - Setting up local environment from source"
echo "========================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or later: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js detected: $NODE_VERSION"

# 2. Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm: https://nodejs.org"
    exit 1
fi

# 3. Install Node.js frontend & full-stack server packages
echo ""
echo "📦 [1/2] Installing Node.js dependencies..."
npm install
echo "✅ Node.js packages installed successfully."

# 4. Optional Python CAN backend setup
echo ""
echo "🐍 [2/2] Checking Python 3 for optional native hardware backend..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python detected: $PYTHON_VERSION"

    if [ -d "backend" ] && [ -f "backend/requirements.txt" ]; then
        echo "🔧 Setting up backend virtual environment (backend/venv)..."
        python3 -m venv backend/venv 2>/dev/null || true
        
        if [ -f "backend/venv/bin/pip" ]; then
            backend/venv/bin/pip install --upgrade pip --quiet 2>/dev/null || true
            backend/venv/bin/pip install -r backend/requirements.txt --quiet 2>/dev/null || true
            echo "✅ Python backend virtual environment ready."
        else
            echo "ℹ️  venv creation skipped or unavailable. You can set it up manually later if needed."
        fi
    fi
else
    echo "ℹ️  Python 3 not found (Optional). The Node.js full-stack server runs without Python."
fi

echo ""
echo "========================================================"
echo "🎉 Setup complete! You can start CANScope right now:"
echo ""
echo "   npm run dev      # Start dev server at http://localhost:3000"
echo "   npm run build    # Build production bundle"
echo "   npm start        # Launch production server"
echo "========================================================"
echo ""
