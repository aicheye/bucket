import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { executeHasuraQuery } from "../../../lib/hasura";
import authOptions from "../../../lib/nextauth"; // adjust path

export async function GET(req: NextRequest) {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function POST(req: NextRequest) {
  let userId: string | undefined;

  const serviceSecret = req.headers.get("x-service-secret");
  if (serviceSecret && serviceSecret === process.env.GRAPHQL_SERVICE_SECRET) {
    userId = req.headers.get("x-user-id") || undefined;
  } else {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
    userId = session.user?.id;
  }

  if (!userId) {
    return new NextResponse("Unauthorized: No User ID", { status: 401 });
  }

  const body = await req.json();
  const { query, variables } = body;

  try {
    const result = await executeHasuraQuery(query, variables, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GraphQL proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
