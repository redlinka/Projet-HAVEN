export async function getSession() {
  const res = await fetch("http://localhost:8000/api/session.php", {
    credentials: "include",
  });
  return res.json(); 
}