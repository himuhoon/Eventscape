import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                await connectDB();
                const existingUser = await User.findOne({ email: user.email });
                if (!existingUser) {
                    await User.create({
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        googleId: account.providerAccountId,
                        role: 'admin',
                    });
                }
                return true;
            }
            return false;
        },
        async session({ session }) {
            if (session.user?.email) {
                await connectDB();
                const dbUser = await User.findOne({ email: session.user.email });
                if (dbUser) {
                    (session.user as any).id = dbUser._id.toString();
                    (session.user as any).role = dbUser.role;
                }
            }
            return session;
        },
    },
    pages: {
        signIn: '/admin/login',
    },
});
