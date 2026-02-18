import { getSnapshot } from "@/lib/content/snapshot";

export async function GET() {
  const snapshot = await getSnapshot();
  return Response.json(snapshot);
}
