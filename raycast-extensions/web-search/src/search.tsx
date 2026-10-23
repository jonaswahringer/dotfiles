import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { openInBrowser, resolveBrowserPath } from "./lib/browser";
import { type Intent, classifyInput } from "./lib/classify";
import { type HistoryEntry, historyTextFor, searchHistory } from "./lib/history";
import { CLEAR_SHORTCUT, COMPLETE_SHORTCUT, DELETE_SHORTCUT } from "./lib/shortcuts";
import { useHistory, useSuggestions } from "./hooks";

const MAX_HISTORY_RESULTS = 8;
const DEFAULT_HISTORY_LIMIT = 100;

function parseLimit(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HISTORY_LIMIT;
}

function describe(intent: Intent): { title: string; subtitle?: string; icon: Icon } {
  switch (intent.kind) {
    case "blank":
      return { title: "New Window", subtitle: "Type to search or enter a URL", icon: Icon.Window };
    case "url":
      return { title: `Open ${intent.url}`, icon: Icon.Globe };
    case "search":
      return { title: `Search Google for “${intent.query}”`, icon: Icon.MagnifyingGlass };
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.Search>();
  const historyEnabled = prefs.enableHistory;
  const history = useHistory(parseLimit(prefs.historyLimit));
  const [searchText, setSearchText] = useState("");
  const suggestions = useSuggestions(searchText, prefs.enableSuggestions);

  async function open(raw: string) {
    const intent = classifyInput(raw);
    try {
      await openInBrowser(resolveBrowserPath(prefs.browserPath), intent);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open the browser",
        message: "Check the Browser App Path preference.",
      });
      return;
    }
    // History is persisted before the window closes, so closing the command cannot cut the write short.
    const text = historyEnabled ? historyTextFor(raw, intent) : undefined;
    let historyFailed = false;
    if (text) {
      try {
        await history.record(text);
      } catch {
        historyFailed = true;
      }
    }
    await closeMainWindow({ clearRootSearch: true });
    if (historyFailed) await showHUD("Opened, but the history entry could not be saved.");
  }

  async function removeEntry(text: string) {
    try {
      await history.remove(text);
      await showToast({ style: Toast.Style.Success, title: "Removed from history" });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update history",
        message: "Nothing was changed.",
      });
    }
  }

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear all search history?",
      message: "This removes every saved entry from this Mac.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await history.clear();
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not clear history",
        message: "Nothing was changed.",
      });
    }
  }

  const intent = classifyInput(searchText);
  const primary = describe(intent);
  const typed = searchText.trim();
  const taken = new Set([typed.toLowerCase()]);

  const matches: HistoryEntry[] = historyEnabled
    ? searchHistory(history.entries, searchText, MAX_HISTORY_RESULTS).filter((e) => !taken.has(e.text.toLowerCase()))
    : [];
  matches.forEach((e) => taken.add(e.text.toLowerCase()));
  const remote = suggestions.items.filter((s) => !taken.has(s.toLowerCase()));

  const hasStoredData = history.entries.length > 0 || history.unreadable;
  const clearAllAction = (
    <Action
      title="Clear All History"
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      shortcut={CLEAR_SHORTCUT}
      onAction={clearAll}
    />
  );

  const completeAction = (text: string) => (
    <Action
      title="Use as Search Text"
      icon={Icon.ArrowRight}
      shortcut={COMPLETE_SHORTCUT}
      onAction={() => setSearchText(text)}
    />
  );

  return (
    <List
      filtering={false}
      isLoading={history.isLoading || suggestions.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or URL (empty opens a new window)"
    >
      <List.Section title={intent.kind === "blank" ? "Open" : "Go"}>
        <List.Item
          id="primary"
          title={primary.title}
          subtitle={primary.subtitle}
          icon={primary.icon}
          actions={
            <ActionPanel>
              <Action title="Open in New Window" icon={Icon.Window} onAction={() => open(searchText)} />
              {typed !== "" && completeAction(typed)}
              {hasStoredData && <ActionPanel.Section>{clearAllAction}</ActionPanel.Section>}
            </ActionPanel>
          }
        />
      </List.Section>

      {matches.length > 0 && (
        <List.Section title="History">
          {matches.map((entry) => (
            <List.Item
              id={`history:${entry.text}`}
              key={`history:${entry.text}`}
              title={entry.text}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action title="Open in New Window" icon={Icon.Window} onAction={() => open(entry.text)} />
                  {completeAction(entry.text)}
                  <ActionPanel.Section>
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={DELETE_SHORTCUT}
                      onAction={() => removeEntry(entry.text)}
                    />
                    {clearAllAction}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {remote.length > 0 && (
        <List.Section title="Google Suggestions">
          {remote.map((text) => (
            <List.Item
              id={`suggestion:${text}`}
              key={`suggestion:${text}`}
              title={text}
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action title="Open in New Window" icon={Icon.Window} onAction={() => open(text)} />
                  {completeAction(text)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
