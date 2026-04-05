/**
 * Suno’s embed shows a top-right control that opens suno.com. Cross-origin rules
 * prevent removing it from inside the iframe; this layer blocks pointer events
 * in that corner so outbound navigation does not fire.
 */
export function SunoEmbedOutboundShield() {
  return (
    <div
      className="pointer-events-auto absolute top-0 right-0 z-20 h-14 w-14 sm:h-16 sm:w-16"
      aria-hidden
    />
  );
}
