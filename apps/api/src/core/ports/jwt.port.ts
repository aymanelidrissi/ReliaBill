export interface JwtPort {
  sign(payload: Record<string, any>, expiresIn?: string): Promise<string>;
  verify<T extends object = any>(token: string): Promise<T>;
}
export const JWT = Symbol('JWT');
