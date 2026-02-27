import "../../styles/components/Chat/ChatDisplayer.css";

export interface Message {
  kind: string;
  sender: string | null;
  content: string;
  date: Date;
}

const ChatMessage = (props: { message: Message }) => {
  const css = props.message.kind === "received_message" ? "received" : "send";

  let newDate = props.message.date;
  let date = newDate.getDate();
  let month = newDate.getMonth() + 1;
  let year = newDate.getFullYear();
  let hour = newDate.getHours();
  let min = newDate.getMinutes();
  let sec = newDate.getSeconds();

  function handleCopyButton() {
    navigator.clipboard.writeText(props.message.content);
  }

  return (
    <div className={`message ${css}`}>
      <p>{props.message.sender}</p>
      <p>{props.message.content}</p>
      <p>
        {css === "send" && (
          <button className="" onClick={() => handleCopyButton()}>
            copy
          </button>
        )}
        {` ${year}:${month < 10 ? `0${month}` : `${month}`}:${date} à ${hour}:${min < 10 ? `0${min}` : min}:${sec < 10 ? `0${sec}` : sec} `}
        {css === "received" && (
          <button className="" onClick={() => handleCopyButton()}>
            copy
          </button>
        )}
      </p>
    </div>
  );
};

export default function ChatDisplayer(props: { listMessage: Message[] }) {
  return (
    <div className="chat-message-displayer">
      <div className="chat-container">
        {props.listMessage.map((message, index) => (
          <ChatMessage
            key={index}
            message={{
              kind: message.kind,
              sender: message.sender,
              content: message.content,
              date: new Date(message.date),
            }}
          />
        ))}
      </div>
    </div>
  );
}
