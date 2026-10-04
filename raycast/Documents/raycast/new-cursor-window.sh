#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title New Cursor Window
# @raycast.mode silent
# @raycast.argument1 { "type": "text", "placeholder": "localdocs subfolder", "optional": true }

# Documentation:
# @raycast.author Jonas Wahringer

BASE_DIR="$HOME/localdocs"

if [ -n "$1" ]; then
  cursor -n "$BASE_DIR/$1"
else
  cursor -n
fi