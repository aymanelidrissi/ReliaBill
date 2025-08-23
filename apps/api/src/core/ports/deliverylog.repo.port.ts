export const DELIVERY_LOGS_REPO = Symbol('DELIVERY_LOGS_REPO');

export type DeliveryLogKind = 'PREPARE' | 'SEND' | 'STATUS' | 'ERROR' | 'SKIP';

export interface DeliveryLogRecord {
  id: string;
  invoiceId: string;
  kind: DeliveryLogKind;
  message: string;
  meta?: any;
  createdAt: Date;
}

export interface DeliveryLogsRepoPort {
  create(input: Omit<DeliveryLogRecord, 'id' | 'createdAt'>): Promise<DeliveryLogRecord>;
  listByInvoice(invoiceId: string, limit?: number): Promise<DeliveryLogRecord[]>;
}
