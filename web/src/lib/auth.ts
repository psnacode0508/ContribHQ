import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

const clientId =
  process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID || "";
const clientSecret =
  process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET || "";

const canonicalBaseUrl =
  process.env.NEXTAUTH_URL || "https://contribhq.vercel.app";

export const authOptions: NextAuthOptions = {
  // Use dynamic request host header and allow reverse proxy forwarding on Vercel
  ...({ trustHost: true } as any),
  providers: [
    GithubProvider({
      clientId,
      clientSecret,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const resolvedBase = baseUrl || canonicalBaseUrl;
      // Prevent redirection loops or previews passing mismatched ports/origins
      if (url.startsWith("/")) {
        return `${resolvedBase}${url}`;
      } else if (new URL(url).origin === resolvedBase) {
        return url;
      }
      return resolvedBase;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as any;
        const githubId = String(githubProfile.id);

        try {
          await prisma.user.upsert({
            where: { githubId },
            update: {
              username: githubProfile.login,
              name: githubProfile.name || githubProfile.login,
              email: githubProfile.email || user.email,
              avatarUrl: githubProfile.avatar_url || user.image,
              bio: githubProfile.bio || null,
            },
            create: {
              githubId,
              username: githubProfile.login,
              name: githubProfile.name || githubProfile.login,
              email: githubProfile.email || user.email,
              avatarUrl: githubProfile.avatar_url || user.image,
              bio: githubProfile.bio || null,
            },
          });
        } catch (dbErr) {
          console.error("[NextAuth signIn] Database user upsert error:", dbErr);
          // Return true so sign-in does not fail if database is temporarily unreachable
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }

      if (account?.provider === "github" && profile) {
        const githubProfile = profile as any;
        const githubId = String(githubProfile.id);

        try {
          const dbUser = await prisma.user.findUnique({
            where: { githubId },
            select: { id: true },
          });

          if (dbUser) {
            token.userId = dbUser.id;
          }
        } catch (dbErr) {
          console.error("[NextAuth jwt] Database lookup error:", dbErr);
        }
      } else if (token.sub && !token.userId) {
        try {
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [{ id: token.sub }, { githubId: token.sub }],
            },
            select: { id: true },
          });

          if (dbUser) {
            token.userId = dbUser.id;
          }
        } catch (dbErr) {
          console.error("[NextAuth jwt] Database fallback lookup error:", dbErr);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = String(token.userId || token.sub || "");
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
