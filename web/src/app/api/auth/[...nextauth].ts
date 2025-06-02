import NextAuth from "next-auth";
import { nextAuthOptions } from "../../../lib/auth/nextAuthOptions";

export const { GET, POST } = NextAuth(nextAuthOptions);
