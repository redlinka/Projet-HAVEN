import { useState, type FormEvent } from 'react';

export interface RoomFormInputs {
  userName: string;
  roomCode?: string;
}

interface RoomFormProps {
  title: string;
  icon: string;
  description: string;
  userName: string;
  onUserNameChange: (value: string) => void;
  roomCode?: string;
  onRoomCodeChange?: (value: string) => void;
  isLoading: boolean;
  onSubmit: (inputs: RoomFormInputs) => Promise<void>;
  submitButtonText: string;
  showRoomCode?: boolean;
}

export default function RoomForm({
  title,
  icon,
  description,
  userName,
  onUserNameChange,
  roomCode,
  onRoomCodeChange,
  isLoading,
  onSubmit,
  submitButtonText,
  showRoomCode = false,
}: RoomFormProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    try {
      await onSubmit({ userName, roomCode });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    }
  };

  const isFormValid = userName.trim() && (!showRoomCode || roomCode?.trim());

  return (
    <div className="room-card">
      <div className="room-card-header">
        <span className="room-card-icon">{icon}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {error && (
        <div className="room-card-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="room-form">
        <div className="room-field">
          <label htmlFor="room-username">Your username</label>
          <input
            id="room-username"
            type="text"
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            placeholder="Ex : Shadow_42"
            maxLength={20}
            disabled={isLoading}
            required
            autoComplete="off"
          />
        </div>

        {showRoomCode && onRoomCodeChange && (
          <div className="room-field">
            <label htmlFor="room-code">Room Code</label>
            <input
              id="room-code"
              type="text"
              value={roomCode || ''}
              onChange={(e) => onRoomCodeChange(e.target.value.toUpperCase())}
              placeholder="Ex : A1B2C3"
              maxLength={6}
              disabled={isLoading}
              required
              autoComplete="off"
              className="room-code-input"
            />
          </div>
        )}

        <button
          type="submit"
          className={`room-btn ${showRoomCode ? 'room-btn--secondary' : 'room-btn--primary'}`}
          disabled={isLoading || !isFormValid}
        >
          {isLoading ? (
            <span className="room-btn-loading">
              <span className="room-spinner" />
              {showRoomCode ? 'Connecting...' : 'Creating...'}
            </span>
          ) : (
            submitButtonText
          )}
        </button>
      </form>
    </div>
  );
}
