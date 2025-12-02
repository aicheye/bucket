/**
 * Server-side Hasura GraphQL utilities.
 * These functions are only safe to use in server-side contexts (API routes, server components).
 * They use JWT signing and direct database access credentials.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from "jsonwebtoken";
import { logger } from "./logger";

type HasuraRole = "authenticated" | "admin";

/**
 * Shared internal function to execute Hasura queries with role-based JWT.
 * This consolidates the common logic between authenticated and admin queries.
 *
 * @param query - The GraphQL query string
 * @param variables - Query variables
 * @param userId - The user ID for the JWT claim
 * @param role - The Hasura role (authenticated or admin)
 * @returns The JSON response from Hasura
 */
async function _executeHasuraQueryWithRole(
  query: string,
  variables: any,
  userId: string,
  role: HasuraRole,
): Promise<any> {
  const payload = {
    "https://hasura.io/jwt/claims": {
      "x-hasura-default-role": role,
      "x-hasura-allowed-roles": [role],
      "x-hasura-user-id": String(userId),
    },
  };

  const token = jwt.sign(payload, process.env.GRAPHQL_SERVICE_SECRET!, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  if (!process.env.GRAPHQL_URL) {
    logger.error("GRAPHQL_URL is not defined");
    throw new Error("GRAPHQL_URL is not defined");
  }

  logger.debug(`Executing Hasura ${role} query`, { userId });

  try {
    const res = await fetch(process.env.GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        `Hasura ${role} query failed with status: ${res.status} ${res.statusText}`,
        { responseBody: text, userId },
      );
      throw new Error(`Hasura fetch failed: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.errors) {
      logger.error(`Hasura ${role} query returned errors`, {
        errors: json.errors,
        userId,
      });
    } else {
      logger.debug(`Hasura ${role} query successful`, { userId });
    }

    return json;
  } catch (error) {
    logger.error(`Error in Hasura ${role} query:`, { error, userId });
    throw error;
  }
}

/**
 * Execute a Hasura query with authenticated user role.
 * Use this for normal user operations with row-level security.
 *
 * @param query - The GraphQL query string
 * @param variables - Query variables
 * @param userId - The user ID for authentication
 * @returns The JSON response from Hasura
 */
export async function executeHasuraQuery(
  query: string,
  variables: any,
  userId: string,
): Promise<any> {
  return _executeHasuraQueryWithRole(query, variables, userId, "authenticated");
}

/**
 * Execute a Hasura query with admin role.
 * This should only be used server-side for trusted operations
 * (like displaying telemetry) after validating session.
 *
 * WARNING: Admin queries bypass row-level security. Use with caution.
 *
 * @param query - The GraphQL query string
 * @param variables - Query variables
 * @param userId - The user ID for tracking (still required but has elevated permissions)
 * @returns The JSON response from Hasura
 */
export async function executeHasuraAdminQuery(
  query: string,
  variables: any,
  userId: string,
): Promise<any> {
  return _executeHasuraQueryWithRole(query, variables, userId, "admin");
}
