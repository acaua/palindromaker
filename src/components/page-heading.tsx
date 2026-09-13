import type { ReactNode } from "react";

// the one page heading: the router focuses `main h1` on navigation, so the
// tabIndex and outline-none are part of the pattern
export default function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h1
      tabIndex={-1}
      className="text-2xl font-bold tracking-tight text-gray-900 outline-none md:text-3xl"
    >
      {children}
    </h1>
  );
}
