export type JournalEntry = {
  id: string;
  title: string;
  note: string;
  category: string;
  date: string;
};

const storageKey = "wildsphere-field-journal-v1";
const changedEvent = "wildsphere:journal-changed";

export function readJournalEntries(): JournalEntry[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (entry): entry is JournalEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.title === "string" &&
        typeof entry.note === "string" &&
        typeof entry.category === "string" &&
        typeof entry.date === "string",
    );
  } catch {
    return [];
  }
}

export function writeJournalEntries(entries: JournalEntry[]): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
    window.dispatchEvent(new Event(changedEvent));
    return true;
  } catch {
    return false;
  }
}

export function addJournalEntry(
  title: string,
  note: string,
  category: string,
): boolean {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    title: title.trim(),
    note: note.trim(),
    category,
    date: new Date().toISOString().slice(0, 10),
  };
  if (!entry.title || !entry.note) return false;
  return writeJournalEntries([entry, ...readJournalEntries()]);
}

export function subscribeToJournal(callback: () => void): () => void {
  window.addEventListener(changedEvent, callback);
  return () => window.removeEventListener(changedEvent, callback);
}
