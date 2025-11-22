import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { executeHasuraQuery } from "../../../../lib/hasura";
import authOptions from "../../../../lib/nextauth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Set PII fields to null and mark anonymous mode + disable telemetry
    const mutation = `
      mutation ScrubUser($id: String!) {
        update_users_by_pk(pk_columns: { id: $id }, _set: { name: null, image: null, email: null, anonymous_mode: true, telemetry_consent: false }) {
          id
        }
      }
    `;

    const res = await executeHasuraQuery(
      mutation,
      { id: session.user.id },
      session.user.id,
    );

    if (res?.errors) {
      console.error("Error scrubbing user:", res.errors);
      return NextResponse.json({ error: "Scrub failed" }, { status: 500 });
    }

    return NextResponse.json({ scrubbed: true }, { status: 200 });
  } catch (err) {
    console.error("Scrub route error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
