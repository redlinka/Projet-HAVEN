import { useState, type FormEvent } from 'react';
import { useChatManager } from '../../contexts/ChatManagerContext';
import '../../styles/components/Room/RoomJoiner.css';

interface RoomJoinerProps {
  /** Appelé quand le salon est rejoint avec succès ; users = joueurs déjà présents */
  onRoomJoined: (userName: string, users: string[]) => void;
  /** Appelé en cas d'erreur */
  onError: (error: string) => void;
  /** Appelé au départ de la requête */
  onConnecting: () => void;
  /** Pré-remplissage du code (ex : transmis via URL) */
  initialRoomId?: string;
}

export default function RoomJoiner({
  onRoomJoined,
  onError,
  onConnecting,
  initialRoomId = '',
}: RoomJoinerProps) {
  const chatManager = useChatManager();
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = userName.trim();
    const trimmedRoom = roomId.trim().toUpperCase();
    if (!trimmedName || !trimmedRoom || isLoading) return;

    setIsLoading(true);
    onConnecting();

    try {
      const existingUsers = await chatManager.joinRoom(trimmedName, trimmedRoom);
      onRoomJoined(trimmedName, existingUsers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de rejoindre le salon';
      onError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="room-joiner">
      <div className="room-card-header">
        <span className="room-card-icon">🎯</span>
        <h3>Rejoindre une partie</h3>
        <p>Entrez le code transmis par votre adversaire</p>
      </div>

      <form onSubmit={handleSubmit} className="room-form">
        <div className="room-field">
          <label htmlFor="joiner-username">Votre pseudo</label>
          <input
            id="joiner-username"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Ex : Pixel_99"
            maxLength={20}
            disabled={isLoading}
            required
            autoComplete="off"
          />
        </div>

        <div className="room-field">
          <label htmlFor="room-code">Code de la partie</label>
          <input
            id="room-code"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            placeholder="Ex : A1B2C3"
            maxLength={6}
            disabled={isLoading}
            required
            autoComplete="off"
            className="room-code-input"
          />
        </div>

        <button
          type="submit"
          className="room-btn room-btn--secondary"
          disabled={isLoading || !userName.trim() || !roomId.trim()}
        >
          {isLoading ? (
            <span className="room-btn-loading">
              <span className="room-spinner" />
              Connexion...
            </span>
          ) : (
            'Rejoindre la partie'
          )}
        </button>
      </form>
    </div>
  );
}