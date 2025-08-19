// purpose: JWT abstraction so we can swap libs later if needed
export interface JwtPort {
  sign(payload: Record<string, any>, expiresIn?: string): Promise<string>;
  verify<T = any>(token: string): Promise<T>;
}
export const JWT = Symbol('JWT');
