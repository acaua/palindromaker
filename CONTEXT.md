# Palindromaker

A single-page editor for crafting palindromes: the text reads the same both ways once non-letters are ignored, and the tool highlights the paired letters, the center, and what breaks the reading.

## Language

**Palindrome**:
A text whose sequence of letters reads the same forwards and backwards. Non-letters are ignored entirely: spaces, punctuation, digits and block separators take no part in the reading.

**Letter space**:
The palindrome-relevant view of a text in which only letters exist, in order. Every position in letter space maps to exactly one character, which is what makes mirroring a single letter a single symmetric edit.

**Mirror**:
For a letter, its partner at the symmetric point in letter space. A mirror-inserted character is reproduced at that partner's side so a finished palindrome stays one.

**Mirror editing**:
Typing or deleting as though the text is always a palindrome: a letter is duplicated (or removed) together with its mirror. Only meaningful while the text already reads the same both ways.

**Center**:
The innermost matching pair of letters; `undefined` when nothing matched.

**Gap**:
The inclusive range of letters that could not be paired because the two sides disagree; `undefined` while the text still reads the same both ways.

**Document analysis**:
The document as the palindrome checker sees it: one normalized text with every index mapped back to the document position it came from. The shared grounding for the highlights, the mirror edits and the editor's facts.

**EditorFacts**:
The single derived answer to "how does the editor read right now" — whether there are letters, whether the text is a palindrome, whether mirror editing is on, and what inserting a word from the word finder would do. The one interface the card's footer consumes.

_Avoid_: using "mirror" for the toggle; the toggle switches **mirror editing**, a mirror is a paired letter.
