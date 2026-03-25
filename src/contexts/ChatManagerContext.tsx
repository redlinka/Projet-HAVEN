import { createContext, useContext } from 'react';
import type { ChatManager } from '../services/ChatManager';

/**
 * Context permettant aux composants enfants (RoomCreator, RoomJoiner)
 * d'accéder au ChatManager sans passer par les props.
 *
 * Usage dans un composant enfant :
 *   const chatManager = useChatManager();
 */
export const ChatManagerContext = createContext<ChatManager | null>(null);

/**
 * Hook utilitaire pour consommer le ChatManagerContext.
 * Lance une erreur si utilisé hors d'un ChatManagerContext.Provider.
 */
export function useChatManager(): ChatManager {
  const ctx = useContext(ChatManagerContext);
  if (!ctx) {
    throw new Error(
      'useChatManager doit être utilisé à l\'intérieur d\'un <ChatManagerContext.Provider>'
    );
  }
  return ctx;
}