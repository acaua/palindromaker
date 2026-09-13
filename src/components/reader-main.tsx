import type { ReactNode } from "react";

// the shared page surface for the reader and Explore
export default function ReaderMain({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col bg-[#faf8f5] px-5 py-5 md:py-8">{children}</main>;
}
