import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Extend the NextAuth session type
declare module "next-auth" {
  interface User {
    id: string;
    isWhitelisted?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isWhitelisted?: boolean;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Add user id and whitelist status to session
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      // Check whitelist status via PostgREST
      if (token.sub) {
        try {
          const isWhitelisted = await checkWhitelist(token.sub);
          if (session.user) {
            session.user.isWhitelisted = isWhitelisted;
          }
        } catch (e) {
          console.error("Error checking whitelist:", e);
          if (session.user) {
            session.user.isWhitelisted = false;
          }
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
});

// Function to check if user is whitelisted via PostgREST
async function checkWhitelist(userId: string): Promise<boolean> {
  try {
    // Use public URL for server-side fetches
    const postgrestUrl =
      process.env.POSTGREST_URL ||
      process.env.NEXT_PUBLIC_POSTGREST_URL ||
      "http://localhost:3001";
    const response = await fetch(
      `${postgrestUrl}/user_whitelist?user_id=eq.${encodeURIComponent(userId)}&select=user_id`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to check whitelist:", response.statusText);
      return false;
    }

    const data = await response.json();
    return data.length > 0;
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return false;
  }
}