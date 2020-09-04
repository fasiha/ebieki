function* range(start: number, end: number) {
  for (; start <= end; ++start) { yield start; }
}
function last<T>(arr: T[]) { return arr[arr.length - 1]; }
export function* numericCombinations(n: number, r: number, loc: number[] = []): IterableIterator<number[]> {
  const idx = loc.length;
  if (idx === r) {
    yield loc;
    return;
  }
  for (let next of range(idx ? last(loc) + 1 : 0, n - r + idx)) { yield* numericCombinations(n, r, loc.concat(next)); }
}
export function* combinations<T>(arr: T[], r: number) {
  for (let idxs of numericCombinations(arr.length, r)) { yield idxs.map(i => arr[i]); }
}
if (module === require.main) {
  let i = 0;
  for (let o of numericCombinations(52, 7)) { i++ }
  console.log(i);
  const shorts = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  let j = 0;
  // for (let o of combinations(shorts, 6)) { j += o.length; }
  console.log(j);
}