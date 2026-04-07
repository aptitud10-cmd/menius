interface DiffLine {
  type: '+' | '-' | ' ';
  text: string;
}

/**
 * For new/create actions: every line is shown as added.
 * For display purposes we show a simple unified diff.
 * When we have the original content we could do a real diff,
 * but since we're showing proposed content, we just mark all lines as new.
 */
export function createDiffLines(newContent: string, originalContent?: string): DiffLine[] {
  if (!originalContent) {
    // Show all lines as additions
    return newContent.split('\n').map(text => ({ type: '+' as const, text }));
  }

  // Simple line-by-line diff using LCS
  const oldLines = originalContent.split('\n');
  const newLines = newContent.split('\n');

  const result: DiffLine[] = [];
  const maxContext = 3;

  // Build a simple edit script using Myers diff (simplified)
  const edits = computeEdits(oldLines, newLines);

  let lastChanged = -maxContext - 1;
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    if (edit.type !== ' ') lastChanged = i;
  }

  for (let i = 0; i < edits.length; i++) {
    const distToChange = Math.min(
      Math.abs(i - lastChanged),
      ...(edits
        .map((e, j) => (e.type !== ' ' ? Math.abs(i - j) : Infinity))
        .filter(d => d <= maxContext))
    );

    if (edits[i].type !== ' ' || distToChange <= maxContext) {
      result.push(edits[i]);
    } else if (result.length > 0 && result[result.length - 1].text !== '...') {
      result.push({ type: ' ', text: '...' });
    }
  }

  return result;
}

function computeEdits(oldLines: string[], newLines: string[]): DiffLine[] {
  // Patience diff (simplified): just compare line by line
  const maxLen = Math.max(oldLines.length, newLines.length);
  const result: DiffLine[] = [];

  let o = 0;
  let n = 0;

  while (o < oldLines.length || n < newLines.length) {
    if (o >= oldLines.length) {
      result.push({ type: '+', text: newLines[n++] });
    } else if (n >= newLines.length) {
      result.push({ type: '-', text: oldLines[o++] });
    } else if (oldLines[o] === newLines[n]) {
      result.push({ type: ' ', text: oldLines[o] });
      o++;
      n++;
    } else {
      // Find next common line (look ahead up to 5)
      let found = false;
      for (let k = 1; k <= 5; k++) {
        if (n + k < newLines.length && oldLines[o] === newLines[n + k]) {
          for (let j = 0; j < k; j++) result.push({ type: '+', text: newLines[n + j] });
          n += k;
          found = true;
          break;
        }
        if (o + k < oldLines.length && oldLines[o + k] === newLines[n]) {
          for (let j = 0; j < k; j++) result.push({ type: '-', text: oldLines[o + j] });
          o += k;
          found = true;
          break;
        }
      }
      if (!found) {
        result.push({ type: '-', text: oldLines[o++] });
        result.push({ type: '+', text: newLines[n++] });
      }
    }
  }

  return result;
}

export function countChanges(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === '+') added++;
    if (l.type === '-') removed++;
  }
  return { added, removed };
}
