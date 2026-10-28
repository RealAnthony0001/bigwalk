#!/bin/bash
# Double-click on macOS: starts the local editor on http://localhost:8000 and opens it (needs a server, not file://)
cd "$(dirname "$0")"
(sleep 1; open http://localhost:8000) &
exec ./run.sh
