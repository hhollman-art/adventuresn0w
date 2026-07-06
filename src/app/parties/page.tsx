import { redirect } from "next/navigation";

/** Legacy route — heroes & fellowships now live at The Tavern. */
export default function PartiesRedirectPage() {
  redirect("/tavern");
}
