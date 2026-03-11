#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}📊 SIT AI Ultra Status${NC}"
echo "======================"

check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i :$port >/dev/null 2>&1; then
            return 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 0
        fi
    else
        if grep -q ":$(printf '%04X' $port)" /proc/net/tcp 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Check Backend
if check_port 5000; then
    echo -e "${GREEN}✓ Backend (port 5000): RUNNING${NC}"
else
    echo -e "${RED}✗ Backend (port 5000): STOPPED${NC}"
fi

# Check Frontend
if check_port 3000; then
    echo -e "${GREEN}✓ Frontend (port 3000): RUNNING${NC}"
else
    echo -e "${RED}✗ Frontend (port 3000): STOPPED${NC}"
fi

echo ""
echo -e "${YELLOW}📱 Access URLs:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  Dashboard: http://localhost:3000/pages/dashboard/"
