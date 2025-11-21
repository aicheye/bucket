/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { executeHasuraQuery } from "./hasura";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's unique identifier. */
      id: any
    } & DefaultSession["user"]
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
        const emailVerified = (profile as any)?.email_verified ?? true;
        if (!emailVerified) {
          return;
        }

        const input = {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
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

        const result = await executeHasuraQuery(mutation, { objects: [input] }, user.id);

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
      session.user.id = token.id;
      return session;
    },
  },
};

export default authOptions;
