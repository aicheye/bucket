import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
import { executeHasuraQuery } from "./hasura";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's unique identifier. */
      id: string;
      telemetry_consent?: boolean | null;
      anonymous_mode?: boolean;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  events: {
    // Called after a successful sign in
    async signIn({ user, profile }) {
      try {
        // Prefer verified email when available
        const googleProfile = profile as GoogleProfile;
        const emailVerified = googleProfile?.email_verified ?? true;
        if (!emailVerified) {
          return;
        }

        // If the existing user has anonymous_mode enabled, don't write PII back
        let nameVal = user.name ?? null;
        let imageVal = user.image ?? null;
        try {
          const checkQuery = `query GetUserById($id: String!) { users_by_pk(id: $id) { anonymous_mode } }`;
          const checkRes = await executeHasuraQuery(
            checkQuery,
            { id: user.id },
            user.id,
          );
          const existing = checkRes?.data?.users_by_pk;
          if (existing && existing.anonymous_mode) {
            nameVal = null;
            imageVal = null;
          }
        } catch (err) {
          console.error("Failed to check anonymous_mode:", err);
        }

        const input = {
          id: user.id,
          email: user.email,
          name: nameVal,
          image: imageVal,
        };

        const mutation = `
          mutation UpsertUser($objects: [users_insert_input!]!) {
            insert_users(
              objects: $objects,
              on_conflict: {
                constraint: users_email_key,
                update_columns: [name, image]
              }
            ) {
              returning {
                id
                email
                name
                image
              }
            }
          }
        `;

        const result = await executeHasuraQuery(
          mutation,
          { objects: [input] },
          user.id,
        );

        if (result.errors) {
          console.error("GraphQL upsert returned errors:", result.errors);
        }
      } catch (err) {
        console.error("GraphQL upsert failed:", err);
      }
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;

      try {
        // Fetch additional user fields from Hasura to include in session
        const query = `query GetUser($id: String!) { users_by_pk(id: $id) { id name email image telemetry_consent anonymous_mode } }`;
        const res = await executeHasuraQuery(
          query,
          { id: token.id },
          String(token.id),
        );
        const userRec = res?.data?.users_by_pk;
        if (userRec) {
          // If anonymous_mode is enabled, scrub values from the session view
          const anon = !!userRec.anonymous_mode;
          session.user.name = anon ? "" : (userRec.name ?? session.user.name);
          session.user.email = anon
            ? ""
            : (userRec.email ?? session.user.email);
          session.user.image = anon
            ? ""
            : (userRec.image ?? session.user.image);
          // Attach flags so client can read them
          session.user.telemetry_consent = userRec.telemetry_consent ?? null;
          session.user.anonymous_mode = anon;
        }
      } catch (err) {
        console.error("Failed to fetch additional session fields:", err);
      }

      return session;
    },
  },
};

export default authOptions;
