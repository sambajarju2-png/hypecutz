import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware handles role-based redirects for authenticated users.
  // Unauthenticated users land here and get sent to /login.
  redirect("/login");
}
