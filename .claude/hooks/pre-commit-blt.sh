#!/usr/bin/env bash
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if ! echo "$CMD" | grep -qE '\bgit\s+commit\b'; then
  exit 0
fi

echo "Running pnpm blt before commit..." >&2
if pnpm blt; then
  exit 0
else
  echo "blt failed — commit blocked. Fix the issues above and retry." >&2
  exit 2
fi
