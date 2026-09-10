// UI language: the same six the word finder's dictionaries cover (the
// pt-br dictionary maps to the "pt" UI code). Framework-agnostic: a
// message table, browser language detection, and a tiny store that React
// reads through useSyncExternalStore (src/hooks/use-i18n.ts). The
// dictionary language is a separate concept (Language in dictionary.ts)
// and a separate pref (lang vs uiLang in persistence.ts).
export const UI_LANGUAGES = ["pt", "en", "es", "de", "fr", "it"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

// the browser's language decides when nothing is stored, pt by design
export const DEFAULT_UI_LANGUAGE: UiLanguage = "pt";

// native names, the same convention as the dictionary's LANGUAGES
export const UI_LANGUAGE_LABELS: Record<UiLanguage, string> = {
  pt: "português",
  en: "english",
  es: "español",
  de: "deutsch",
  fr: "français",
  it: "italiano",
};

// number formatting (result counts) follows the UI language, not the
// browser's
export const UI_LANGUAGE_LOCALES: Record<UiLanguage, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
};

// the document-language tags for <html lang> (voice selection et al.);
// the pt UI code stays generic, but its strings, dictionary and sample
// are Brazilian, so the document says pt-BR — matching index.html
export const UI_LANGUAGE_TAGS: Record<UiLanguage, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
  de: "de",
  fr: "fr",
  it: "it",
};

const en = {
  "app.tagline":
    "Write a phrase. We’ll show where its mirrored letters agree—and where they break.",
  "nav.home": "Home",
  "nav.about": "About",
  "nav.aria": "Main navigation",
  "nav.menu": "Menu",
  "about.title": "About Palindromaker",
  "about.body1":
    "Palindromaker is a small editor for crafting palindromes: phrases that read the same backwards and forwards, ignoring spaces, punctuation and accents.",
  "about.body2":
    "As you type, the editor colors the mirror: letters that agree glow blue around the center, and the stretch that still breaks the symmetry is marked in red. With mirror typing on, every letter you write is echoed at its symmetric position, so symmetry is never more than one keystroke away.",
  "about.body3":
    "The word finder searches dictionaries in six languages and inserts words straight into the mirror. Everything stays in your browser — nothing is sent anywhere.",
  "editor.ariaLabel": "Palindrome editor",
  "status.startTyping": "Start typing",
  "status.palindrome": "Palindrome",
  "status.notPalindrome": "Not a palindrome",
  findWords: "Find words",
  "finder.aria": "word finder",
  "finder.close": "Close word finder",
  "finder.legendAria": "word finder legend",
  "finder.loading": "loading dictionary…",
  "finder.error": "failed to load dictionary",
  "finder.retry": "retry",
  "finder.noMatches": "No matches",
  "finder.hintMirrored": "Click a word to insert it at the caret, and its mirror opposite.",
  "finder.hintPaused":
    "Click a word to insert it at the caret. Mirroring resumes once the text reads the same both ways.",
  "finder.hintCaret": "Click a word to insert it at the caret.",
  "finder.searchSr": "Search words",
  "finder.searchAria": "search words",
  "finder.searchPlaceholder": "Search words…",
  language: "Language",
  "finder.languageAria": "dictionary language",
  "finder.matchPosition": "match position",
  "finder.startsWith": "starts with",
  "finder.endsWith": "ends with",
  "finder.contains": "contains",
  "finder.resultsAria": "results",
  "finder.word": "Word",
  "finder.mirror": "Mirror",
  "finder.resultOne": "{count} result",
  "finder.resultMany": "{count} results",
  "legend.editorAria": "editor legend",
  "legend.center": "center of the palindrome",
  "legend.breaks": "breaks the palindrome",
  "legend.caretMirror": "mirror of your caret",
  "legend.pair": "mirror is also a word",
  "legend.palindromeWord": "palindrome word",
  "mirror.typing": "Mirror typing",
  "mirror.on": "Mirror typing is on",
  "mirror.off": "Mirror typing is off",
  "conflict.message": "This palindrome was edited in another tab.",
  "conflict.loadTheirs": "Load that version",
  "conflict.keepMine": "Keep this one",
} as const;

export type MessageKey = keyof typeof en;

type Table = Record<MessageKey, string>;

const pt: Table = {
  "app.tagline":
    "Escreva uma frase. Mostramos onde as letras espelhadas combinam — e onde se quebram.",
  "nav.home": "Início",
  "nav.about": "Sobre",
  "nav.aria": "Navegação principal",
  "nav.menu": "Menu",
  "about.title": "Sobre o Palindromaker",
  "about.body1":
    "O Palindromaker é um pequeno editor para criar palíndromos: frases que se leem da mesma forma de trás para frente, ignorando espaços, pontuação e acentos.",
  "about.body2":
    "Enquanto você digita, o editor pinta o espelho: as letras que se correspondem brilham em azul ao redor do centro, e o trecho que ainda quebra a simetria fica marcado em vermelho. Com a digitação espelhada ligada, cada letra que você escreve é repetida na sua posição simétrica — a simetria fica a um toque de distância.",
  "about.body3":
    "O buscador de palavras consulta dicionários em seis idiomas e insere palavras direto no espelho. Tudo fica no seu navegador — nada é enviado a lugar algum.",
  "editor.ariaLabel": "Editor de palíndromos",
  "status.startTyping": "Comece a digitar",
  "status.palindrome": "Palíndromo",
  "status.notPalindrome": "Não é um palíndromo",
  findWords: "Buscar palavras",
  "finder.aria": "buscador de palavras",
  "finder.close": "Fechar buscador de palavras",
  "finder.legendAria": "legenda do buscador de palavras",
  "finder.loading": "carregando dicionário…",
  "finder.error": "falha ao carregar o dicionário",
  "finder.retry": "tentar novamente",
  "finder.noMatches": "Nenhum resultado",
  "finder.hintMirrored":
    "Clique numa palavra para inseri-la no cursor, e o seu espelho do outro lado.",
  "finder.hintPaused":
    "Clique numa palavra para inseri-la no cursor. A digitação espelhada volta quando o texto for igual nos dois sentidos.",
  "finder.hintCaret": "Clique numa palavra para inseri-la no cursor.",
  "finder.searchSr": "Buscar palavras",
  "finder.searchAria": "buscar palavras",
  "finder.searchPlaceholder": "Buscar palavras…",
  language: "Idioma",
  "finder.languageAria": "idioma do dicionário",
  "finder.matchPosition": "posição da busca",
  "finder.startsWith": "começa com",
  "finder.endsWith": "termina com",
  "finder.contains": "contém",
  "finder.resultsAria": "resultados",
  "finder.word": "Palavra",
  "finder.mirror": "Espelho",
  "finder.resultOne": "{count} resultado",
  "finder.resultMany": "{count} resultados",
  "legend.editorAria": "legenda do editor",
  "legend.center": "centro do palíndromo",
  "legend.breaks": "quebra o palíndromo",
  "legend.caretMirror": "espelho do seu cursor",
  "legend.pair": "o espelho também é palavra",
  "legend.palindromeWord": "palavra palíndromo",
  "mirror.typing": "Digitação espelhada",
  "mirror.on": "Digitação espelhada ativada",
  "mirror.off": "Digitação espelhada desativada",
  "conflict.message": "Este palíndromo foi editado em outra aba.",
  "conflict.loadTheirs": "Carregar aquela versão",
  "conflict.keepMine": "Manter esta",
};

const es: Table = {
  "app.tagline":
    "Escribe una frase. Mostramos dónde coinciden las letras espejadas — y dónde se rompen.",
  "nav.home": "Inicio",
  "nav.about": "Acerca de",
  "nav.aria": "Navegación principal",
  "nav.menu": "Menú",
  "about.title": "Sobre Palindromaker",
  "about.body1":
    "Palindromaker es un pequeño editor para crear palíndromos: frases que se leen igual al derecho y al revés, ignorando espacios, puntuación y acentos.",
  "about.body2":
    "Mientras escribes, el editor pinta el espejo: las letras que coinciden brillan en azul alrededor del centro, y el tramo que aún rompe la simetría queda marcado en rojo. Con la escritura en espejo activada, cada letra que escribes se repite en su posición simétrica — la simetría queda a una tecla de distancia.",
  "about.body3":
    "El buscador de palabras consulta diccionarios en seis idiomas e inserta palabras directamente en el espejo. Todo queda en tu navegador — nada se envía a ningún lado.",
  "editor.ariaLabel": "Editor de palíndromos",
  "status.startTyping": "Empieza a escribir",
  "status.palindrome": "Palíndromo",
  "status.notPalindrome": "No es un palíndromo",
  findWords: "Buscar palabras",
  "finder.aria": "buscador de palabras",
  "finder.close": "Cerrar buscador de palabras",
  "finder.legendAria": "leyenda del buscador de palabras",
  "finder.loading": "cargando diccionario…",
  "finder.error": "no se pudo cargar el diccionario",
  "finder.retry": "reintentar",
  "finder.noMatches": "Sin resultados",
  "finder.hintMirrored":
    "Haz clic en una palabra para insertarla en el cursor, y su espejo al otro lado.",
  "finder.hintPaused":
    "Haz clic en una palabra para insertarla en el cursor. La escritura en espejo se reanuda cuando el texto se lee igual en ambos sentidos.",
  "finder.hintCaret": "Haz clic en una palabra para insertarla en el cursor.",
  "finder.searchSr": "Buscar palabras",
  "finder.searchAria": "buscar palabras",
  "finder.searchPlaceholder": "Buscar palabras…",
  language: "Idioma",
  "finder.languageAria": "idioma del diccionario",
  "finder.matchPosition": "posición de coincidencia",
  "finder.startsWith": "empieza con",
  "finder.endsWith": "termina con",
  "finder.contains": "contiene",
  "finder.resultsAria": "resultados",
  "finder.word": "Palabra",
  "finder.mirror": "Espejo",
  "finder.resultOne": "{count} resultado",
  "finder.resultMany": "{count} resultados",
  "legend.editorAria": "leyenda del editor",
  "legend.center": "centro del palíndromo",
  "legend.breaks": "rompe el palíndromo",
  "legend.caretMirror": "espejo de tu cursor",
  "legend.pair": "el espejo también es palabra",
  "legend.palindromeWord": "palabra palíndromo",
  "mirror.typing": "Escritura en espejo",
  "mirror.on": "La escritura en espejo está activada",
  "mirror.off": "La escritura en espejo está desactivada",
  "conflict.message": "Este palíndromo fue editado en otra pestaña.",
  "conflict.loadTheirs": "Cargar esa versión",
  "conflict.keepMine": "Conservar esta",
};

const de: Table = {
  "app.tagline":
    "Schreibe einen Satz. Wir zeigen, wo gespiegelte Buchstaben zusammenpassen — und wo sie zerbrechen.",
  "nav.home": "Start",
  "nav.about": "Über",
  "nav.aria": "Hauptnavigation",
  "nav.menu": "Menü",
  "about.title": "Über Palindromaker",
  "about.body1":
    "Palindromaker ist ein kleiner Editor für Palindrome: Sätze, die vorwärts wie rückwärts gleich lauten — Leerzeichen, Satzzeichen und Akzente bleiben dabei außer Acht.",
  "about.body2":
    "Während du tippst, färbt der Editor den Spiegel: übereinstimmende Buchstaben leuchten um den Mittelpunkt blau auf, und der Abschnitt, der die Symmetrie noch bricht, ist rot markiert. Mit eingeschaltetem gespiegeltem Tippen wiederholt sich jeder Buchstabe an seiner symmetrischen Stelle — die Symmetrie ist nie mehr als einen Tastenschlag entfernt.",
  "about.body3":
    "Die Wortsuche durchsucht Wörterbücher in sechs Sprachen und fügt Wörter direkt in den Spiegel ein. Alles bleibt in deinem Browser — nichts wird irgendwohin gesendet.",
  "editor.ariaLabel": "Palindrom-Editor",
  "status.startTyping": "Fang an zu tippen",
  "status.palindrome": "Palindrom",
  "status.notPalindrome": "Kein Palindrom",
  findWords: "Wörter finden",
  "finder.aria": "Wortsuche",
  "finder.close": "Wortsuche schließen",
  "finder.legendAria": "Legende der Wortsuche",
  "finder.loading": "Wörterbuch wird geladen…",
  "finder.error": "Wörterbuch konnte nicht geladen werden",
  "finder.retry": "Erneut versuchen",
  "finder.noMatches": "Keine Treffer",
  "finder.hintMirrored":
    "Klicke auf ein Wort, um es an der Einfügemarke einzufügen – mit seinem Spiegel auf der anderen Seite.",
  "finder.hintPaused":
    "Klicke auf ein Wort, um es an der Einfügemarke einzufügen. Das gespiegelte Tippen setzt wieder ein, sobald der Text in beide Richtungen gleich liest.",
  "finder.hintCaret": "Klicke auf ein Wort, um es an der Einfügemarke einzufügen.",
  "finder.searchSr": "Wörter suchen",
  "finder.searchAria": "wörter suchen",
  "finder.searchPlaceholder": "Wörter suchen…",
  language: "Sprache",
  "finder.languageAria": "Wörterbuchsprache",
  "finder.matchPosition": "Trefferposition",
  "finder.startsWith": "beginnt mit",
  "finder.endsWith": "endet mit",
  "finder.contains": "enthält",
  "finder.resultsAria": "ergebnisse",
  "finder.word": "Wort",
  "finder.mirror": "Spiegel",
  "finder.resultOne": "{count} Ergebnis",
  "finder.resultMany": "{count} Ergebnisse",
  "legend.editorAria": "Legende des Editors",
  "legend.center": "Zentrum des Palindroms",
  "legend.breaks": "bricht das Palindrom",
  "legend.caretMirror": "Spiegel deiner Einfügemarke",
  "legend.pair": "der Spiegel ist auch ein Wort",
  "legend.palindromeWord": "Palindrom-Wort",
  "mirror.typing": "Gespiegeltes Tippen",
  "mirror.on": "Gespiegeltes Tippen ist aktiviert",
  "mirror.off": "Gespiegeltes Tippen ist deaktiviert",
  "conflict.message": "Dieses Palindrom wurde in einem anderen Tab bearbeitet.",
  "conflict.loadTheirs": "Andere Version laden",
  "conflict.keepMine": "Diese behalten",
};

const fr: Table = {
  "app.tagline":
    "Écrivez une phrase. Nous montrons où les lettres en miroir se correspondent — et où elles se brisent.",
  "nav.home": "Accueil",
  "nav.about": "À propos",
  "nav.aria": "Navigation principale",
  "nav.menu": "Menu",
  "about.title": "À propos de Palindromaker",
  "about.body1":
    "Palindromaker est un petit éditeur pour composer des palindromes : des phrases qui se lisent de la même façon dans les deux sens, en ignorant espaces, ponctuation et accents.",
  "about.body2":
    "Pendant que vous tapez, l’éditeur colorie le miroir : les lettres qui se répondent s’illuminent en bleu autour du centre, et le passage qui brise encore la symétrie est marqué en rouge. Avec l’écriture en miroir activée, chaque lettre tapée se reflète à sa position symétrique — la symétrie n’est jamais à plus d’une touche.",
  "about.body3":
    "La recherche de mots interroge des dictionnaires en six langues et insère les mots directement dans le miroir. Tout reste dans votre navigateur — rien n’est envoyé nulle part.",
  "editor.ariaLabel": "Éditeur de palindromes",
  "status.startTyping": "Commencez à écrire",
  "status.palindrome": "Palindrome",
  "status.notPalindrome": "Ce n’est pas un palindrome",
  findWords: "Chercher des mots",
  "finder.aria": "recherche de mots",
  "finder.close": "Fermer la recherche de mots",
  "finder.legendAria": "légende de la recherche de mots",
  "finder.loading": "chargement du dictionnaire…",
  "finder.error": "échec du chargement du dictionnaire",
  "finder.retry": "réessayer",
  "finder.noMatches": "Aucun résultat",
  "finder.hintMirrored":
    "Cliquez sur un mot pour l’insérer au curseur, ainsi que son miroir de l’autre côté.",
  "finder.hintPaused":
    "Cliquez sur un mot pour l’insérer au curseur. L’écriture en miroir reprend dès que le texte se lit de la même façon dans les deux sens.",
  "finder.hintCaret": "Cliquez sur un mot pour l’insérer au curseur.",
  "finder.searchSr": "Chercher des mots",
  "finder.searchAria": "chercher des mots",
  "finder.searchPlaceholder": "Chercher des mots…",
  language: "Langue",
  "finder.languageAria": "langue du dictionnaire",
  "finder.matchPosition": "position de la correspondance",
  "finder.startsWith": "commence par",
  "finder.endsWith": "finit par",
  "finder.contains": "contient",
  "finder.resultsAria": "résultats",
  "finder.word": "Mot",
  "finder.mirror": "Miroir",
  "finder.resultOne": "{count} résultat",
  "finder.resultMany": "{count} résultats",
  "legend.editorAria": "légende de l’éditeur",
  "legend.center": "centre du palindrome",
  "legend.breaks": "brise le palindrome",
  "legend.caretMirror": "miroir de votre curseur",
  "legend.pair": "le miroir est aussi un mot",
  "legend.palindromeWord": "mot palindrome",
  "mirror.typing": "Écriture en miroir",
  "mirror.on": "L’écriture en miroir est activée",
  "mirror.off": "L’écriture en miroir est désactivée",
  "conflict.message": "Ce palindrome a été modifié dans un autre onglet.",
  "conflict.loadTheirs": "Charger cette version",
  "conflict.keepMine": "Garder celle-ci",
};

const it: Table = {
  "app.tagline":
    "Scrivi una frase. Mostriamo dove le lettere speculari corrispondono — e dove si rompono.",
  "nav.home": "Home",
  "nav.about": "Info",
  "nav.aria": "Navigazione principale",
  "nav.menu": "Menu",
  "about.title": "Informazioni su Palindromaker",
  "about.body1":
    "Palindromaker è un piccolo editor per comporre palindromi: frasi che si leggono allo stesso modo in entrambe le direzioni, ignorando spazi, punteggiatura e accenti.",
  "about.body2":
    "Mentre scrivi, l’editor colora lo specchio: le lettere che si corrispondono brillano di blu attorno al centro, e il tratto che ancora rompe la simmetria è evidenziato in rosso. Con la digitazione speculare attiva, ogni lettera scritta viene ripetuta nella sua posizione simmetrica — la simmetria è sempre a un tasto di distanza.",
  "about.body3":
    "Il cercatore di parole interroga dizionari in sei lingue e inserisce le parole direttamente nello specchio. Tutto resta nel tuo browser — nulla viene inviato altrove.",
  "editor.ariaLabel": "Editor di palindromi",
  "status.startTyping": "Inizia a scrivere",
  "status.palindrome": "Palindromo",
  "status.notPalindrome": "Non è un palindromo",
  findWords: "Cerca parole",
  "finder.aria": "ricerca di parole",
  "finder.close": "Chiudi la ricerca di parole",
  "finder.legendAria": "legenda della ricerca di parole",
  "finder.loading": "caricamento del dizionario…",
  "finder.error": "impossibile caricare il dizionario",
  "finder.retry": "riprova",
  "finder.noMatches": "Nessun risultato",
  "finder.hintMirrored":
    "Fai clic su una parola per inserirla al cursore, e il suo specchio dall’altro lato.",
  "finder.hintPaused":
    "Fai clic su una parola per inserirla al cursore. La digitazione speculare riprende quando il testo si legge allo stesso modo in entrambe le direzioni.",
  "finder.hintCaret": "Fai clic su una parola per inserirla al cursore.",
  "finder.searchSr": "Cerca parole",
  "finder.searchAria": "cerca parole",
  "finder.searchPlaceholder": "Cerca parole…",
  language: "Lingua",
  "finder.languageAria": "lingua del dizionario",
  "finder.matchPosition": "posizione della corrispondenza",
  "finder.startsWith": "inizia per",
  "finder.endsWith": "finisce per",
  "finder.contains": "contiene",
  "finder.resultsAria": "risultati",
  "finder.word": "Parola",
  "finder.mirror": "Specchio",
  "finder.resultOne": "{count} risultato",
  "finder.resultMany": "{count} risultati",
  "legend.editorAria": "legenda dell’editor",
  "legend.center": "centro del palindromo",
  "legend.breaks": "rompe il palindromo",
  "legend.caretMirror": "specchio del tuo cursore",
  "legend.pair": "lo specchio è anche una parola",
  "legend.palindromeWord": "parola palindromo",
  "mirror.typing": "Digitazione speculare",
  "mirror.on": "La digitazione speculare è attiva",
  "mirror.off": "La digitazione speculare è disattivata",
  "conflict.message": "Questo palindromo è stato modificato in un’altra scheda.",
  "conflict.loadTheirs": "Carica quella versione",
  "conflict.keepMine": "Mantieni questa",
};

export const messages: Record<UiLanguage, Table> = { en, pt, es, de, fr, it };

export const translate = (lang: UiLanguage, key: MessageKey): string => messages[lang][key];

// "{count} results" / "{count} resultados": the wording is per-language
// data (finder.resultOne/finder.resultMany, pluralized by count), the
// number follows the result language's locale; the "{count}" placeholder
// is substituted here
export const resultCount = (lang: UiLanguage, count: number): string =>
  messages[lang][count === 1 ? "finder.resultOne" : "finder.resultMany"].replace(
    "{count}",
    count.toLocaleString(UI_LANGUAGE_LOCALES[lang]),
  );

const isUiLanguage = (value: unknown): value is UiLanguage =>
  typeof value === "string" && (UI_LANGUAGES as readonly string[]).includes(value);

// pure so tests can drive it: the stored pref wins, then the browser's
// BCP-47 tags matched on the primary subtag, then the default
export const resolveUiLanguage = (
  stored: unknown,
  detected: readonly string[] | null,
): UiLanguage => {
  if (isUiLanguage(stored)) return stored;
  for (const tag of detected ?? []) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isUiLanguage(primary)) return primary;
  }
  return DEFAULT_UI_LANGUAGE;
};

// the browser's language list, or null where there is none (node, tests)
const navigatorLanguages = (): readonly string[] | null => {
  if (typeof navigator === "undefined") return null;
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  if (navigator.language) return [navigator.language];
  return null;
};

// The store. The module defaults to "en" so unit tests that render
// components without initializing see the English strings they assert on;
// the app path always goes through initUiLanguage, whose fallback is pt.
let current: UiLanguage = "en";
let initialized = false;
const listeners = new Set<() => void>();

export const getUiLanguage = (): UiLanguage => current;

export const subscribeUiLanguage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setUiLanguage = (lang: UiLanguage): void => {
  if (lang === current) return;
  current = lang;
  for (const listener of listeners) listener();
};

// applies the stored pref (falling back to browser detection) once per
// page load; App calls this before anything reads the language. After the
// first call it is a no-op, so re-renders never second-guess a switch.
export const initUiLanguage = (
  stored: unknown,
  detected: readonly string[] | null = navigatorLanguages(),
): UiLanguage => {
  if (!initialized) {
    initialized = true;
    current = resolveUiLanguage(stored, detected);
  }
  return current;
};
