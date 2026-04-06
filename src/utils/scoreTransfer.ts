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
export function determineWinner(score1: number, score2: number) {
  return score1 > score2
    ? { winner: score1, loser: score2 }
    : { winner: score2, loser: score1 };
}
