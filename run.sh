#!/bin/bash
# Spustí lokální editor. Použití: ./run.sh [port]   (výchozí port 8000)
cd "$(dirname "$0")"
PORT=${1:-8000}

if lsof -iTCP:"$PORT" -sTCP:LISTEN -n >/dev/null 2>&1; then
  echo "Port $PORT už je obsazený. Zkus jiný: ./run.sh $((PORT + 1))" >&2
  exit 1
fi

cat <<EOF
Big Walk – lokální editor
  Editor:    http://localhost:$PORT
  Náhled:    http://localhost:$PORT/?view   (tak to uvidí diváci online)
  Port:      $PORT, jen 127.0.0.1 (z jiných zařízení není dostupný)
  Data:      $PWD/data/walks.json
  PID:       $$
  Zastavení: Ctrl+C
EOF

exec python3 server.py "$PORT"
