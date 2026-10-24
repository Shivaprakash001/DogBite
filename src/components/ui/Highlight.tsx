// Marker-pen highlight on a phrase inside a sentence (e.g. "kick you out").

export function Highlight({ text, phrase }: { text: string; phrase: string }) {
  const i = phrase ? text.indexOf(phrase) : -1;
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="relative inline-block">
        <span className="relative z-10">{phrase}</span>
        <span aria-hidden className="bg-marigold/80 absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 rounded-full" />
      </span>
      {text.slice(i + phrase.length)}
    </>
  );
}
