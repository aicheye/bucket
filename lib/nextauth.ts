import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
import { UPSERT_USER_BY_EMAIL } from "./graphql/mutations";
import { GET_USER } from "./graphql/queries";
import { executeHasuraQuery } from "./hasura";
import { logger } from "./logger";

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    // Called after a successful sign in
    async signIn({ user, profile }) {
      logger.info("User signed in", { userId: user.id, email: user.email });
      try {
        // Prefer verified email when available
        const googleProfile = profile as GoogleProfile;
        const emailVerified = googleProfile?.email_verified ?? true;
        if (!emailVerified) {
          logger.warn("User email not verified", { userId: user.id });
          return;
        }

        // If the existing user has anonymous_mode enabled, don't write PII back
        let nameVal = user.name ?? null;
        let imageVal = user.image ?? null;
        try {
          const checkRes = await executeHasuraQuery(
            GET_USER,
            { id: user.id },
            user.id,
          );
          const existing = checkRes?.data?.users_by_pk;
          if (existing && existing.anonymous_mode) {
            nameVal = null;
            imageVal = null;
          }
        } catch (err) {
          logger.error("Failed to check anonymous_mode:", {
            error: err,
            userId: user.id,
          });
        }

        const input = {
          id: user.id,
          email: user.email,
          name: nameVal,
          image: imageVal,
        };

        const result = await executeHasuraQuery(
          UPSERT_USER_BY_EMAIL,
          { objects: [input] },
          user.id,
        );

        if (result.errors) {
          logger.error("GraphQL upsert returned errors:", {
            errors: result.errors,
            userId: user.id,
          });
        }
      } catch (err) {
        logger.error("GraphQL upsert failed:", { error: err, userId: user.id });
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
        const res = await executeHasuraQuery(
          GET_USER,
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
        logger.error("Failed to fetch additional session fields:", {
          error: err,
          userId: token.id,
        });
      }

      return session;
    },
  },
};

export default authOptions;
