/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from "jsonwebtoken";

export async function executeHasuraQuery(
  query: string,
  variables: any,
  userId: string,
) {
  const payload = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "authenticated",
      "x-hasura-allowed-roles": ["authenticated"],
      "x-hasura-user-id": String(userId),
    },
  };

  const token = jwt.sign(payload, process.env.GRAPHQL_SERVICE_SECRET!, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  if (!process.env.GRAPHQL_URL) {
    console.error("GRAPHQL_URL is not defined");
    throw new Error("GRAPHQL_URL is not defined");
  }

  console.log(`Executing Hasura query against ${process.env.GRAPHQL_URL}`);

  try {
    const res = await fetch(process.env.GRAPHQL_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      console.error(
        `Hasura fetch failed with status: ${res.status} ${res.statusText}`,
      );
      const text = await res.text();
      console.error("Response body:", text);
      throw new Error(`Hasura fetch failed: ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error in executeHasuraQuery:", error);
    throw error;
  }
}

export async function executeHasuraAdminQuery(
  query: string,
  variables: any,
  userId: string,
) {
  // Sign a Hasura JWT as admin. This should only be used server-side for
  // trusted operations (like displaying telemetry) after validating session.
  const payload = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": "admin",
      "x-hasura-allowed-roles": ["admin"],
      "x-hasura-user-id": String(userId),
    },
  };

  const token = jwt.sign(payload, process.env.GRAPHQL_SERVICE_SECRET!, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  if (!process.env.GRAPHQL_URL) {
    console.error("GRAPHQL_URL is not defined");
    throw new Error("GRAPHQL_URL is not defined");
  }

  try {
    const res = await fetch(process.env.GRAPHQL_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      console.error(
        `Hasura admin fetch failed with status: ${res.status} ${res.statusText}`,
      );
      const text = await res.text();
      console.error("Response body:", text);
      throw new Error(`Hasura fetch failed: ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    console.error("Error in executeHasuraAdminQuery:", error);
    throw error;
  }
}
