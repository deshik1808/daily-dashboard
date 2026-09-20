// lib/notes.ts

export interface NoteValidationResult {
  valid: boolean;
  value?: string;
  error?: string;
}

export function validateAndNormalizeNote(raw: unknown): NoteValidationResult {
  if (typeof raw !== "string") {
    return { valid: false, error: "Note must be text" };
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Note cannot be empty" };
  }

  return { valid: true, value: trimmed };
}

/**
 * Automatically converts leading hyphens (e.g. "- ") into bullets ("• ")
 * at the beginning of lines.
 */
export function transformHyphenToBullet(text: string): string {
  return text.replace(/(^|\n)(\s*)-\s/g, "$1$2• ");
}

export interface SmartKeyResult {
  text: string;
  cursor: number;
}

/**
 * Handles Enter key on bulleted lines:
 * - If on an empty bullet ("• "), clears the bullet to exit list mode.
 * - If on a bullet with text, inserts "\n• " to continue the list.
 */
export function handleBulletEnter(text: string, cursor: number): SmartKeyResult | null {
  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  const lineEnd = text.indexOf("\n", cursor);
  const effectiveEnd = lineEnd === -1 ? text.length : lineEnd;
  const line = text.slice(lineStart, effectiveEnd);

  const match = line.match(/^(\s*)([•\-\*])\s*(.*)$/);
  if (!match) return null;

  const indent = match[1];
  const bulletContent = match[3];

  // If bullet line is empty (user wants to exit the list)
  if (bulletContent.trim() === "") {
    const newText = text.slice(0, lineStart) + text.slice(effectiveEnd);
    return {
      text: newText,
      cursor: lineStart,
    };
  }

  // User wants to add next bullet
  const prefix = `\n${indent}• `;
  const newText = text.slice(0, cursor) + prefix + text.slice(cursor);
  return {
    text: newText,
    cursor: cursor + prefix.length,
  };
}

/**
 * Handles Backspace on an empty bullet line to clear the bullet smoothly.
 */
export function handleBulletBackspace(text: string, cursor: number): SmartKeyResult | null {
  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1;
  const lineBeforeCursor = text.slice(lineStart, cursor);

  // If the line up to the cursor is just the bullet symbol and space
  const match = lineBeforeCursor.match(/^(\s*)([•\-\*])\s$/);
  if (!match) return null;

  const newText = text.slice(0, lineStart) + text.slice(cursor);
  return {
    text: newText,
    cursor: lineStart,
  };
}

export interface NoteLine {
  type: "bullet" | "text" | "empty";
  text: string;
}

/**
 * Parses note text into structured lines for clean rendering.
 */
export function parseNoteLines(content: string): NoteLine[] {
  if (!content) return [];
  const lines = content.split("\n");
  return lines.map((line) => {
    if (line.trim() === "") {
      return { type: "empty", text: "" };
    }
    const match = line.match(/^(\s*)([•\-\*])\s+(.*)$/);
    if (match) {
      return { type: "bullet", text: match[3] };
    }
    return { type: "text", text: line };
  });
}

