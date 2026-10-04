#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title New Browser Window
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖
# @raycast.packageName utils
# @raycast.argument1 { "type": "text", "placeholder": "Search or URL", "optional": true }

# Documentation:
# @raycast.description Opens a new browser window with an optional search or URL
# @raycast.author Jonas Wahringer

query="$*"

if [ -z "$query" ]; then
  open -na "/Applications/Helium.app" --args --new-window
else
  url=$(/usr/bin/python3 - "$query" <<'PY'
import re
import sys
from urllib.parse import quote

query = sys.argv[1].strip()
if re.fullmatch(r"https?://\S+", query, re.IGNORECASE):
    url = query
elif re.fullmatch(r"(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?", query, re.IGNORECASE):
    url = "https://" + query
else:
    url = "https://www.google.com/search?q=" + quote(query, safe="")
print(url)
PY
  ) || exit 1

  open -na "/Applications/Helium.app" --args --new-window "$url"
fi
