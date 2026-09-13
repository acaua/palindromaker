import { embedIframeSrc } from "@/lib/bluesky-post";
import { useBlueskyEmbed } from "@/hooks/use-bluesky-embed";

// The official Bluesky embed, without loading embed.js: the same iframe
// URL plus the tiny height handshake that script performs (see
// use-bluesky-embed.ts).
export default function BlueskyEmbed({ uri, title }: { uri: string; title: string }) {
  const { id, refUrl, height } = useBlueskyEmbed();

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <iframe
        title={title}
        src={embedIframeSrc(uri, id, refUrl)}
        data-bluesky-id={id}
        width="100%"
        height={height}
        scrolling="no"
        className="block rounded-xl border-0 bg-white shadow-sm"
      />
    </div>
  );
}
