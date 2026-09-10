// the app's one clipboard touchpoint, shaped like persistence.ts's
// localStorageOrNull: reading navigator.clipboard can throw (blocked
// permissions, insecure context) and writeText can reject, so callers go
// through here and a failed copy never breaks the interaction
export type TextWriter = { writeText: (text: string) => Promise<void> };

export const clipboardOrNull = (): TextWriter | null => {
  try {
    if (typeof navigator === "undefined") return null;
    return navigator.clipboard ?? null;
  } catch {
    return null;
  }
};

// best effort like every storage write: true when the text landed
export const copyText = async (writer: TextWriter | null, text: string): Promise<boolean> => {
  if (!writer) return false;
  try {
    await writer.writeText(text);
    return true;
  } catch {
    return false;
  }
};
