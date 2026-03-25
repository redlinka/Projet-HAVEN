import { useState, type FormEvent } from 'react';
import { useChatManager } from '../../contexts/ChatManagerContext';
import '../../styles/components/Room/RoomCreator.css';

interface RoomCreatorProps {
  /** Appelé quand le salon est créé avec succès */
  onRoomCreated: (userName: string, roomId: string) => void;
  /** Appelé en cas d'erreur de connexion */
  onError: (error: string) => void;
  /** Appelé au moment où la requête part (pour afficher un état de chargement global) */
  onConnecting: () => void;
}

export default function RoomCreator({ onRoomCreated, onError, onConnecting }: RoomCreatorProps) {
  const chatManager = useChatManager();
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = userName.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    onConnecting();

    try {
      const roomId = await chatManager.createRoom(trimmed);
      onRoomCreated(trimmed, roomId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du salon';
      onError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="room-creator">
      <div className="room-card-header">
        <span className="room-card-icon">👑</span>
        <h3>Créer une partie</h3>
        <p>Générez un code et invitez votre adversaire</p>
      </div>

      <form onSubmit={handleSubmit} className="room-form">
        <div className="room-field">
          <label htmlFor="creator-username">Votre pseudo</label>
          <input
            id="creator-username"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Ex : Shadow_42"
            maxLength={20}
            disabled={isLoading}
            required
            autoComplete="off"
          />
        </div>

        <button
          type="submit"
          className="room-btn room-btn--primary"
          disabled={isLoading || !userName.trim()}
        >
          {isLoading ? (
            <span className="room-btn-loading">
              <span className="room-spinner" />
              Création...
            </span>
          ) : (
            'Créer la partie'
          )}
        </button>
      </form>
    </div>
  );
}