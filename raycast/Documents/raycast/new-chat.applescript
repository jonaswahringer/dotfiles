#!/usr/bin/osascript

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title New chat
# @raycast.mode silent

set targetURL to "https://t3.chat"

tell application "Helium"
	activate
	set w to make new window
	set URL of active tab of w to targetURL
	set index of w to 1
end tell

delay 0.2

tell application "System Events"
	tell process "Helium"
		set frontmost to true
	end tell
end tell