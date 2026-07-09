import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";

export default async function RootPage() {
  const profile = await getCurrentUser();
  redirect(profile ? "/journal" : "/login");
}
