import type { Keyboard } from "@raycast/api";

type Chord = { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };

/**
 * Completion uses ⌘↵ (Raycast's default key for the second action in a panel). A bare Tab is not a
 * documented way to bind an action and was not verified, so it is not used.
 */
export const COMPLETE_SHORTCUT: Chord = { modifiers: ["cmd"], key: "return" };
export const DELETE_SHORTCUT: Chord = { modifiers: ["ctrl"], key: "x" };
export const CLEAR_SHORTCUT: Chord = { modifiers: ["ctrl", "shift"], key: "x" };
