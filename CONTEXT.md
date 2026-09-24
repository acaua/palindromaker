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
The innermost matching letters: a pair, or a single letter when it is its own mirror. Absent when no letters matched.

**Gap**:
The inclusive span the reading left unpaired: from the outermost two letters that disagree inward. Absent while the text reads the same both ways.

**Raw text**:
The document's original characters, kept exactly as written and normalized in no way, with block boundaries reading as a single newline. The form the text is shared or posted in.

**Document analysis**:
The document as the checker sees it: the letters in reading order, its raw text, and the reading's verdict.

### Mirroring

**Mirror**:
For a letter, the letter at the symmetric point in letter space: its partner. A letter can be its own mirror — the center of an odd reading — and a letter the reading failed to pair has none.
_Avoid_: reflection, twin

**Caret mirror**:
The letter at the caret and its mirror, highlighted together while the caret rests on one. Shown, not typed; absent when the caret's letter has no mirror.
_Avoid_: cursor mirror, caret highlight

**Mirror editing**:
Typing or deleting as though the text is always a palindrome: a letter is duplicated, or removed, together with its mirror. Only meaningful while the text already reads the same both ways.
_Avoid_: mirror typing, mirror mode, mirror toggle, or "mirror" alone for the toggle.

**Mirror word**:
A word spelled with its letters reversed — its mirror at the word scale. A word that reverses to itself is its own mirror.

**Word insert mode**:
What a word-finder click will do, shown to the user before the click: **mirrored** (the word and its mirror), **caret** (the word alone, mirror editing off), or **paused** (the word alone, mirror editing on but waiting for the text to read the same both ways).
_Avoid_: waiting, "not at all" — a word is never withheld.

**Word insert**:
Putting a whole word into the document the way mirror editing puts in one letter: the word at the caret and its mirror at the symmetric point in letter space. Nothing is ever deleted, and the word is never withheld: even a paused or caret click inserts the word alone.

### The editor

**Session**:
What the editor opens with: its initial content and the remembered mirror-editing and finder states.

**Preferences**:
The choices remembered across visits — dictionary language, UI language, mirror editing, finder open — kept apart from the document itself.

**EditorFacts**:
The single derived answer to "how does the editor read right now": the raw text, whether there are letters, whether it is a palindrome, whether mirror editing is on, whether it is over the share length limit, and whether it may be shared — which needs all of: letters, a palindrome, and within the limit.

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

**Bluesky post share**:
Posting the finished palindrome to Bluesky through Bluesky's own composer, prefilled with the text plus a link — the full share link, the site root, or the text alone, whichever first fits Bluesky's limit. Never truncated; absent when even the text alone is too long.
_Avoid_: composer, "post" alone

### Bluesky

**Bluesky post**:
A post read from Bluesky's public API, and the thing Post reference points at and Post view describes. Not to be confused with the outbound Bluesky post share.
_Avoid_: status, skeet

**Annotation**:
A span a Bluesky post declares over its text (a link, mention or tag). Its letters are kept out when the palindrome inside the post is extracted.

**Palindrome extraction**:
The longest palindrome a post's text contains, taken in letter space. Punctuation hugging it is kept; annotation spans and bare #/@ tokens contribute no letters and cannot be crossed. Fewer than three letters counts as none.
_Avoid_: substring, match

**Restricted post**:
A post whose post or record labels mark it adult or unavailable to logged-out viewers. Logged-out reader views also apply account labels and profile `!no-unauthenticated`; Account Explore applies account `!hide`/`!no-unauthenticated` and profile `!no-unauthenticated` to each record without promoting adult or profile-wide labels to every post. Hashtag Explore preserves the legacy post-label-only filter. Its extracted palindrome is withheld.
_Avoid_: flagged post, NSFW post

**Palindrome tag**:
A hashtag the Explore page searches in the current UI language, each expanded to its accent-stripped spelling because Bluesky's search treats the two as distinct.

**Post view**:
How the app presents one post: whether it is restricted, the palindrome it contains (absent when restricted or when there is none), and its text split into plain and annotated spans. The card and the reader share it.

**Account-owned post**:
An original post or reply whose author DID and AT-URI repository DID both match the requested account's resolved DID. Reposts, pins, and entries with any feed reason are not account-owned.

**Account palindrome view**:
The Explore account mode at `/explore?account=…`, showing account-owned posts and replies that contain a palindrome. Older posts load explicitly through the opaque author-feed cursor. Account Explore evaluates post and record labels per record and honors account access labels without using adult/profile-wide labels to suppress the account as a whole.

**Author feed**:
The chronological public `app.bsky.feed.getAuthorFeed` stream used by the account palindrome view. It requests no pins and the app removes every reason-bearing or foreign-account entry.

### Word finder

**Dictionary language**:
One of the six word lists the finder searches, pt-br included.

**UI language**:
One of the six languages the interface is written in; its "pt" code covers the pt-br dictionary.

**Mirror match**:
A dictionary word whose mirror is also a word (a pair), or is itself (a palindrome word).
