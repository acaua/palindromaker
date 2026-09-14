# Share links carry the text in the URL fragment

A shared palindrome is encoded into the `/p#t=…` fragment, so the URL _is_ the payload: no backend, no stored records, no expiry, and the text never leaves the reader's browser. The costs are a hard cap (`MAX_SHARE_TEXT`) and URLs that grow with the text; base64url was compared and rejected as longer and less legible for no gain. The fragment format is therefore public and effectively frozen — changing it breaks every link already posted.
