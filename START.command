#!/bin/bash
cd "$(dirname "$0")" || exit 1

echo
echo "Starting MD Workspace..."
echo "Folder: $(pwd)"
echo

if [ ! -f "server.js" ]; then
  echo "ERROR: server.js was not found in:"
  pwd
  echo "Make sure START.command and server.js are in the same folder."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js was not found."
  echo "Run: node --version"
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo "Node: $(node --version)"
echo "Opening http://localhost:8080"
open "http://localhost:8080"
node server.js

echo
echo "MD Workspace server stopped."
read -n 1 -s -r -p "Press any key to close..."
