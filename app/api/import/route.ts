export const dynamic = "force-dynamic";

// Kept only to overwrite the retired CSV importer in repositories that were
// updated through GitHub's file uploader. Previous records are now seeded
// automatically from the bundled migration data.
export async function POST() {
  return Response.json(
    { error: "Manual import is no longer needed. Previous data is loaded automatically." },
    { status: 410 },
  );
}
