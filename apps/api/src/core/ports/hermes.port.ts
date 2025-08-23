export const HERMES = Symbol('HERMES');

export interface HermesPort {
  send(input: { xmlPath: string }): Promise<{ messageId: string; delivered?: boolean }>;
}
