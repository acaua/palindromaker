import Editor from "@/components/editor";

export default function App() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 max-w-2xl">
          <div className="mb-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 font-mono text-lg font-bold text-white shadow-sm"
            >
              ↔
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Palindromaker
            </h1>
          </div>
          <p className="text-base leading-relaxed text-gray-600 sm:text-lg">
            Write a phrase. We’ll show where its mirrored letters agree—and
            where they break.
          </p>
        </header>

        <Editor />
      </div>
    </main>
  );
}
