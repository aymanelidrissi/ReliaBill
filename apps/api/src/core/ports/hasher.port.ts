export interface HasherPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
export const HASHER = Symbol('HASHER');
