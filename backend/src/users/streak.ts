/**
 * Yeni odak gününde serinin nasil ilerledigi. gap: son odak gununden bugune gecen gun sayisi.
 * Arada bos kalan her gun icin bir seri koruma harcanir; koruma yetmezse seri 1'den baslar
 * ve koruma harcanmaz.
 */
export function advanceStreak(
  currentStreak: number,
  gap: number,
  freezes: number,
): { streak: number; freezesUsed: number } {
  if (gap === 1) return { streak: currentStreak + 1, freezesUsed: 0 };
  const missedDays = gap - 1;
  if (missedDays > 0 && currentStreak > 0 && freezes >= missedDays) {
    return { streak: currentStreak + 1, freezesUsed: missedDays };
  }
  return { streak: 1, freezesUsed: 0 };
}
