import { useState, useEffect, useCallback } from 'react';
import { ChatManagerContext } from '../../contexts/ChatManagerContext';
import type { ChatManager } from '../../services/ChatManager';
import { type Message } from './ChatDisplayer';
import ChatDisplayer from './ChatDisplayer';
import ChatSender from './ChatSender';
import RoomCreator from '../Room/RoomCreator';
import RoomJoiner from '../Room/RoomJoiner';
import '../../styles/components/Chat/Chatter.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionState = 'idle' | 'connecting' | 'connected';

interface ChatterProps {
  /** Instance du gestionnaire de communication (WebSocket ou Mock) */
  chatManager: ChatManager;
  /**
   * Callback appelé quand l'admin lance la partie.
   * Le composant parent gère alors la navigation vers le jeu.
   */
  onGameStarted?: () => void;
  /** Pré-remplissage du code de salon (ex : passé via URL) */
  initialRoomId?: string;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Chatter({ chatManager, onGameStarted, initialRoomId }: ChatterProps) {
  const [state, setState] = useState<ConnectionState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // ── Enregistrement des listeners dès le montage ────────────────────────────
  useEffect(() => {
    chatManager.setMessageListener((msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    chatManager.setRoomUpdateListener((users) => {
      setConnectedUsers(users);
    });

    chatManager.setGameStartedListener(() => {
      onGameStarted?.();
    });

    // Nettoyage : fermeture propre en quittant le composant
    return () => {
      chatManager.close();
    };
  }, [chatManager, onGameStarted]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRoomCreated = useCallback((userName: string, id: string) => {
    setRoomId(id);
    setIsAdmin(true);
    setConnectedUsers([userName]);
    setState('connected');
    setError(null);
  }, []);

  const handleRoomJoined = useCallback((userName: string, existingUsers: string[]) => {
    // existingUsers = joueurs déjà là ; on s'ajoute nous-mêmes
    setConnectedUsers([...existingUsers, userName]);
    setIsAdmin(false);
    setState('connected');
    setError(null);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setState('idle');
  }, []);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Affichage immédiat côté expéditeur
      setMessages((prev) => [
        ...prev,
        { kind: 'send_message', sender: null, content, date: new Date() },
      ]);
      chatManager.sendMessage(content);
    },
    [chatManager]
  );

  const handleStartGame = useCallback(() => {
    chatManager.startGame();
  }, [chatManager]);

  const handleDisconnect = useCallback(() => {
    chatManager.close();
    setState('idle');
    setMessages([]);
    setConnectedUsers([]);
    setRoomId(null);
    setIsAdmin(false);
    setError(null);
  }, [chatManager]);

  const handleCopyCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [roomId]);

  // ── Rendu : Écran de chargement ───────────────────────────────────────────

  if (state === 'connecting') {
    return (
      <div className="chatter-loading">
        <div className="chatter-spinner" />
        <p>Connexion au salon en cours...</p>
      </div>
    );
  }

  // ── Rendu : Lobby (sélection créer / rejoindre) ───────────────────────────

  if (state === 'idle') {
    return (
      <ChatManagerContext.Provider value={chatManager}>
        <div className="chatter-lobby">
          {error && (
            <div className="chatter-error" role="alert">
              <span>⚠️ {error}</span>
              <button className="chatter-error-close" onClick={() => setError(null)}>
                ✕
              </button>
            </div>
          )}

          <div className="chatter-lobby-cards">
            <RoomCreator
              onRoomCreated={handleRoomCreated}
              onError={handleError}
              onConnecting={() => setState('connecting')}
            />

            <div className="chatter-lobby-separator">
              <span>ou</span>
            </div>

            <RoomJoiner
              onRoomJoined={handleRoomJoined}
              onError={handleError}
              onConnecting={() => setState('connecting')}
              initialRoomId={initialRoomId}
            />
          </div>
        </div>
      </ChatManagerContext.Provider>
    );
  }

  // ── Rendu : Salon de chat ─────────────────────────────────────────────────

  const canStartGame = isAdmin && connectedUsers.length >= 2;

  return (
    <div className="chatter">
      {/* Header : joueurs connectés + code de la partie */}
      <header className="chatter-header">
        <div className="chatter-header-left">
          <span className="chatter-label">Joueurs</span>
          <div className="chatter-users">
            {connectedUsers.map((user) => (
              <span key={user} className="chatter-user-badge">
                {user}
              </span>
            ))}
            {connectedUsers.length < 2 && (
              <span className="chatter-user-badge chatter-user-badge--waiting">
                En attente...
              </span>
            )}
          </div>
        </div>

        <div className="chatter-header-right">
          {/* Code visible seulement par l'admin */}
          {isAdmin && roomId && (
            <div className="chatter-room-code">
              <span className="chatter-label">Code</span>
              <code className="chatter-code-value">{roomId}</code>
              <button
                className={`chatter-copy-btn ${codeCopied ? 'chatter-copy-btn--copied' : ''}`}
                onClick={handleCopyCode}
                title="Copier le code"
              >
                {codeCopied ? '✓ Copié' : '📋 Copier'}
              </button>
            </div>
          )}

          <button className="chatter-quit-btn" onClick={handleDisconnect}>
            Quitter
          </button>
        </div>
      </header>

      {/* Corps : historique des messages */}
      <div className="chatter-body">
        <ChatDisplayer listMessage={messages} />
      </div>

      {/* Pied : envoi de message + (admin) lancer la partie */}
      <footer className="chatter-footer">
        <ChatSender onMessageEntered={handleSendMessage} />

        {isAdmin && (
          <button
            className={`chatter-start-btn ${canStartGame ? 'chatter-start-btn--ready' : ''}`}
            onClick={handleStartGame}
            disabled={!canStartGame}
            title={canStartGame ? 'Lancer la partie' : 'En attente du 2ème joueur'}
          >
            {canStartGame ? '🎮 Lancer la partie' : '⏳ En attente du 2ème joueur…'}
          </button>
        )}
      </footer>
    </div>
  );
}