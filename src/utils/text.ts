export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

export function scoreCandidate(inputAlbum: string, inputArtist: string, albumTitle: string, artistName: string): number {
  const albumNeedle = normalizeForMatch(inputAlbum);
  const artistNeedle = normalizeForMatch(inputArtist);
  const albumHaystack = normalizeForMatch(albumTitle);
  const artistHaystack = normalizeForMatch(artistName);

  let score = 0;

  score += similarityScore(albumNeedle, albumHaystack) * 60;
  score += similarityScore(artistNeedle, artistHaystack) * 40;

  if (albumHaystack === albumNeedle) {
    score += 40;
  }

  if (artistNeedle && (artistHaystack === artistNeedle || artistHaystack.includes(artistNeedle) || artistNeedle.includes(artistHaystack))) {
    score += 80;
  }

  return score;
}

function similarityScore(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.includes(right) || right.includes(left)) {
    return 1;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let overlap = 0;

  for (const char of leftSet) {
    if (rightSet.has(char)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftSet.size, rightSet.size, 1);
}
