/**
 * Calcule le transfert de points en multijoueur
 */
export function calculateScoreTransfer(
  winnerScore: number,
  loserScore: number,
  transferPercentage: number = 0.25,
): { winner: number; loser: number } {
  // Calculer le montant à transférer
  const transferAmount = Math.floor(loserScore * transferPercentage);

  return {
    winner: winnerScore + transferAmount,
    loser: Math.max(0, loserScore - transferAmount),
  };
}

/**
 * Détermine le gagnant et le perdant basé sur les scores
 */
export function determineWinner(
  score1: number,
  score2: number,
): { winner: number; loser: number; draw: boolean } {
  if (score1 === score2) {
    return { winner: score1, loser: score2, draw: true };
  }

  return score1 > score2
    ? { winner: score1, loser: score2, draw: false }
    : { winner: score2, loser: score1, draw: false };
}
