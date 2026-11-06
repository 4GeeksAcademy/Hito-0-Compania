import { redirect } from "next/navigation";

export default function OutboundPage() {
  redirect("/backoffice/inventory/picking");
}