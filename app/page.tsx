import { redirect } from "next/navigation";

// Middleware sends signed-in users to /dashboard; everyone else signs in.
export default function Home() {
  redirect("/login");
}
