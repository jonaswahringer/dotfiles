#!/usr/bin/osascript

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title New Terminal Window
# @raycast.mode silent

set homeDir to POSIX path of (path to home folder)

tell application "Ghostty"
	set cfg to new surface configuration
	set initial working directory of cfg to homeDir
	set win to new window with configuration cfg
	activate window win
end tell