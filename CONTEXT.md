# Palindromaker

A single-page editor for crafting palindromes: the text reads the same both ways once non-letters are ignored, and the tool highlights the paired letters, the center, and what breaks the reading.

## Language

### The reading

**Palindrome**:
A text whose sequence of letters reads the same forwards and backwards. Case and accents are ignored (é reads as e), and non-letters — spaces, punctuation, digits, block separators — take no part.

**Letter space**:
The letters of a text in reading order, with everything else dropped: the sequence a palindrome is judged in and the axis mirroring counts along.

**Normalization**:
How a character is reduced to its reading: case and combining marks fall away. Two characters read the same when they normalize alike.

**Center**:
The innermost pair of matching letters. Absent when no pair matched.

**Gap**:
The inclusive range of letters that could not be paired because the two sides disagree. Absent while the text reads the same both ways.

**Raw text**:
The document's original characters, kept exactly as written and normalized in no way. The form the text is shared or posted in.

**Document analysis**:
The document as the checker sees it: the letters in reading order, its raw text, and the reading's verdict.

### Mirroring

**Mirror**:
For a letter, its partner at the symmetric point in letter space. A mirror-inserted letter is reproduced at that partner's side so a finished palindrome stays one.

**Mirror editing**:
Typing or deleting as though the text is always a palindrome: a letter is duplicated, or removed, together with its mirror. Only meaningful while the text already reads the same both ways.
_Avoid_: mirror typing, mirror mode, mirror toggle, or "mirror" alone for the toggle.

**Mirror word**:
A word spelled with its letters reversed — its mirror at the word scale. A word that reverses to itself is its own mirror.

**Word insert**:
Putting a whole word into the document the way mirror editing puts in one letter: the word at the caret and its mirror at the symmetric point in letter space. Its mode — what the finder promises before the click — is whether the word goes in mirrored, at the caret alone, or not at all.

### The editor

**Session**:
What the editor opens with: its initial content and the remembered mirror-editing and finder states.

**Preferences**:
The choices remembered across visits — dictionary language, UI language, mirror editing, finder open — kept apart from the document itself.

**EditorFacts**:
The single derived answer to "how does the editor read right now": whether there are letters, whether the text is a palindrome, whether mirror editing is on, and whether the text can be shared or is too long to.

**Conflict**:
The state where another tab saved a different document while this one held unsaved edits. Resolved by taking theirs or keeping mine.

**Sample**:
The starter palindrome shown when storage holds nothing usable. One per UI language.

### Sharing

**Share fragment**:
The text a reader link carries in its fragment — the link itself is the payload.

**Reader**:
The view a shared link opens: the same card and highlights as the editor, but unable to change its text.
_Avoid_: viewer.

**Post reference**:
The reference a reader link carries to a Bluesky post. Opens the post and the palindrome within it.

### Bluesky

**Annotation**:
A span a Bluesky post declares over its text (a link, mention or tag). Its letters are kept out when the palindrome inside the post is extracted.

### Word finder

**Dictionary language**:
One of the six word lists the finder searches, pt-br included.

**UI language**:
One of the six languages the interface is written in; its "pt" code covers the pt-br dictionary.

**Mirror match**:
A dictionary word whose mirror is also a word (a pair), or is itself (a palindrome word).
