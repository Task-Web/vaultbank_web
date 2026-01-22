#!/bin/bash

# VaultBank Banking Clone - Development Environment Setup Script
# This script sets up and runs the development environment for the VaultBank Bank clone

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=5173
BACKEND_PORT=8000
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
BACKEND_VENV=".venv"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to get PID of process using port
get_pid_on_port() {
    lsof -ti :$1
}

# Function to stop services
stop_services() {
    print_info "Stopping development services..."

    # Stop backend if running
    if port_in_use $BACKEND_PORT; then
        print_info "Stopping backend server on port $BACKEND_PORT..."
        BACKEND_PID=$(get_pid_on_port $BACKEND_PORT)
        kill $BACKEND_PID 2>/dev/null || true
        sleep 2
        print_success "Backend stopped"
    else
        print_info "Backend not running on port $BACKEND_PORT"
    fi

    # Stop frontend if running
    if port_in_use $FRONTEND_PORT; then
        print_info "Stopping frontend server on port $FRONTEND_PORT..."
        FRONTEND_PID=$(get_pid_on_port $FRONTEND_PORT)
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 2
        print_success "Frontend stopped"
    else
        print_info "Frontend not running on port $FRONTEND_PORT"
    fi

    print_success "All services stopped"
}

# Handle stop command
if [ "$1" = "stop" ]; then
    stop_services
    exit 0
fi

# Check if services are already running
BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if port_in_use $BACKEND_PORT; then
    BACKEND_RUNNING=true
fi

if port_in_use $FRONTEND_PORT; then
    FRONTEND_RUNNING=true
fi

if [ "$BACKEND_RUNNING" = true ] || [ "$FRONTEND_RUNNING" = true ]; then
    print_warning "Development services are already running!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🏦 VaultBank Banking Clone - Development Environment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    if [ "$BACKEND_RUNNING" = true ]; then
        print_success "✓ Backend API server is running"
        echo "  URL: http://localhost:$BACKEND_PORT"
        echo "  API Docs: http://localhost:$BACKEND_PORT/docs"
        echo "  State Management: http://localhost:$BACKEND_PORT/state-manage"
    fi

    echo ""

    if [ "$FRONTEND_RUNNING" = true ]; then
        print_success "✓ Frontend development server is running"
        echo "  URL: http://localhost:$FRONTEND_PORT"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "To stop services, run: ./init.sh stop"
    echo ""
    exit 0
fi

# Start setup
print_info "🏦 Setting up VaultBank Banking Clone development environment..."
echo ""

# Check for required tools
print_info "Checking required tools..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "✓ Node.js $(node -v) found"

if ! command -v uv &> /dev/null; then
    print_error "uv is not installed. Please install uv first: https://docs.astral.sh/uv/"
    exit 1
fi

print_success "✓ uv $(uv --version) found"

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "✓ npm $(npm -v) found"
echo ""

# Setup backend
print_info "Setting up backend..."

if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory '$BACKEND_DIR' not found. Please ensure the project structure exists."
    exit 1
fi

cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d "$BACKEND_VENV" ]; then
    print_info "Creating Python virtual environment..."
    uv venv "$BACKEND_VENV"
    print_success "✓ Virtual environment created at $BACKEND_VENV"
fi
export UV_PROJECT_ENVIRONMENT="$BACKEND_VENV"

# Install Python dependencies
if [ -f "requirements.txt" ]; then
    print_info "Installing Python dependencies..."
    uv pip install -q -r requirements.txt
    print_success "✓ Python dependencies installed"
else
    print_warning "No requirements.txt found, skipping Python dependency installation"
fi

cd ..
echo ""

# Setup frontend
print_info "Setting up frontend..."

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory '$FRONTEND_DIR' not found. Please ensure the project structure exists."
    exit 1
fi

cd "$FRONTEND_DIR"

# Install Node dependencies
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node dependencies (this may take a few minutes)..."
        npm install --silent
        print_success "✓ Node dependencies installed"
    else
        print_info "Node dependencies already installed"
    fi
else
    print_warning "No package.json found, skipping Node dependency installation"
fi

cd ..
echo ""

# Start services
print_info "Starting development services..."
echo ""

# Start backend
print_info "Starting backend server..."
cd "$BACKEND_DIR"

# Start backend in background
nohup uv run uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > ../backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if port_in_use $BACKEND_PORT; then
    print_success "✓ Backend server started (PID: $BACKEND_PID)"
else
    print_error "Failed to start backend server. Check backend.log for details."
    cd ..
    exit 1
fi

cd ..

# Start frontend
print_info "Starting frontend development server..."
cd "$FRONTEND_DIR"

# Start frontend in background
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if port_in_use $FRONTEND_PORT; then
    print_success "✓ Frontend server started (PID: $FRONTEND_PID)"
else
    print_error "Failed to start frontend server. Check frontend.log for details."
    cd ..
    exit 1
fi

cd ..
echo ""

# Success message
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🏦 VaultBank Banking Clone - Development Environment Ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "✓ All services are running"
echo ""
echo "  📡 Backend API:"
echo "     URL:       http://localhost:$BACKEND_PORT"
echo "     API Docs:  http://localhost:$BACKEND_PORT/docs"
echo "     State UI:  http://localhost:$BACKEND_PORT/state-manage"
echo ""
echo "  🎨 Frontend App:"
echo "     URL:       http://localhost:$FRONTEND_PORT"
echo ""
echo "  📝 Logs:"
echo "     Backend:   ./backend.log"
echo "     Frontend:  ./frontend.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To stop services, run: ./init.sh stop"
echo ""
echo "Happy coding! 🚀"
echo ""
