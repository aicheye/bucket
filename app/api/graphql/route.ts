import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import authOptions from "../../../lib/nextauth"; // adjust path

export async function GET(req: NextRequest) {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function POST(req: NextRequest) {
  // Optional: block if not signed in
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();

  const payload = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "authenticated",
      "x-hasura-allowed-roles": ["authenticated"],
      "x-hasura-user-id": String(session.user?.id || ""),
    },
  }

  const token = jwt.sign(payload, process.env.GRAPHQL_SERVICE_SECRET!, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  const res = await fetch(process.env.GRAPHQL_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
