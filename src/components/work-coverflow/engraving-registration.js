// Lazy poster/optics data. The live runtime takes these points as arguments;
// it must not import this module during gallery startup. Coordinates describe
// stroke centre lines on the full printed face, top-left origin, not its crop.
// [INK_X from bake-panel's group.getBBox(), end x of the first subpath].
const first = new Map([
  ['mavacamten', [43.56, 113]],
  ['capivasertib', [40.68, 130]],
  ['faricimab', [45.72, 90]],
]);

export function printStroke(name) {
  if (!first.has(name)) throw new RangeError(`No registered folio: ${name}`);
  const [tx,end] = first.get(name);
  // All three folios start at M4 9 and have the same INK_Y. The second
  // subpath is separate ink; neither it nor the four register dashes emit.
  return [4,end].map(x => ({u:(tx+1.44*x)/360, v:(32.7+1.32*9)/204}));
}
