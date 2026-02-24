import React from "react";

export default function Button({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>Button</button>;
}
