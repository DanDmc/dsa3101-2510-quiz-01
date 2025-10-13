#!/usr/bin/env bash
# Wait for a TCP host:port to become available
# Usage: ./wait-for-it.sh host:port --timeout=60 --strict -- command args
set -e

HOSTPORT=$1
shift
TIMEOUT=30
STRICT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout=*) TIMEOUT="${1#*=}" ;;
    --strict) STRICT=true ;;
    --) shift; break ;;
  esac
  shift
done

HOST=$(echo $HOSTPORT | cut -d: -f1)
PORT=$(echo $HOSTPORT | cut -d: -f2)

echo "⏳ Waiting for $HOST:$PORT to be available..."
for i in $(seq $TIMEOUT); do
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "✅ $HOST:$PORT is available!"
    exec "$@"
    exit 0
  fi
  sleep 1
done

if $STRICT; then
  echo "❌ Timeout after ${TIMEOUT}s waiting for $HOST:$PORT" >&2
  exit 1
fi
