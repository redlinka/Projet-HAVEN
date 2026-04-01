import { useState } from "react";
import { useRoomService } from "../../contexts/RoomServiceContext";
import RoomForm from "./RoomForm";
import "../../styles/components/Room/RoomCreator.css";

interface RoomCreatorProps {
  /** Appelé quand le salon est créé avec succès */
  onRoomCreated: (userName: string, roomId: string) => void;
  /** Appelé en cas d'erreur de connexion */
  onError: (error: string) => void;
  /** Appelé au moment où la requête part (pour afficher un état de chargement global) */
  onConnecting: () => void;
}

export default function RoomCreator({
  onRoomCreated,
  onError,
  onConnecting,
}: RoomCreatorProps) {
  const roomService = useRoomService();
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async ({ userName: name }: { userName: string }) => {
    setIsLoading(true);
    onConnecting();

    try {
      const roomId = await roomService.createRoom(name);
      onRoomCreated(name, roomId);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la création du salon";
      onError(message);
      setIsLoading(false);
    }
  };

  return (
    <RoomForm
      title="Créer une partie"
      icon="👑"
      description="Générez un code et invitez votre adversaire"
      userName={userName}
      onUserNameChange={setUserName}
      isLoading={isLoading}
      onSubmit={handleSubmit}
      submitButtonText="Créer la partie"
    />
  );
}
