export const HERMES = Symbol('HERMES');

export type HermesSendInput = { xmlPath: string };
export type HermesSendResult = { messageId: string; delivered: boolean };

export type HermesStatus = 'SENT' | 'DELIVERED' | 'FAILED';
export type HermesStatusResult = { messageId: string; status: HermesStatus; delivered: boolean };

export interface HermesPort {
  send(input: HermesSendInput): Promise<HermesSendResult>;
  status(messageId: string): Promise<HermesStatusResult>;
  verifySignature(payload: string, signature: string, secret: string): boolean;
}
