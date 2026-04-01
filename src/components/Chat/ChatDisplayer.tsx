import { formatMessageDate } from "../../utils/dateFormatter";
import "../../styles/components/Chat/ChatDisplayer.css";

export interface Message {
  kind: string;
  sender: string | null;
  content: string;
  date: Date;
}

interface ChatMessageProps {
  message: Message;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isSent = message.kind === "send_message";
  const messageClass = isSent ? "send" : "received";

  const handleCopyContent = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`message ${messageClass}`}>
      <p className="message-sender">{message.sender}</p>
      <p className="message-content">{message.content}</p>
      <div className="message-footer">
        {isSent && (
          <button
            className="message-copy-btn"
            onClick={handleCopyContent}
            title="Copier le message"
          >
            copy
          </button>
        )}
        <time className="message-time">{formatMessageDate(message.date)}</time>
        {!isSent && (
          <button
            className="message-copy-btn"
            onClick={handleCopyContent}
            title="Copier le message"
          >
            copy
          </button>
        )}
      </div>
    </div>
  );
}

interface ChatDisplayerProps {
  listMessage: Message[];
}

export default function ChatDisplayer({ listMessage }: ChatDisplayerProps) {
  return (
    <div className="chat-message-displayer">
      <div className="chat-container">
        {listMessage.map((message, index) => (
          <ChatMessage
            key={`${message.sender}-${index}`}
            message={{
              ...message,
              date: new Date(message.date),
            }}
          />
        ))}
      </div>
    </div>
  );
}
