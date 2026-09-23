export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  try {
    const url = new URL(decodeURIComponent(key));
    if (!url.hostname.endsWith("vercel-storage.com")) throw new Error("Invalid host");
    return Response.redirect(url, 307);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
