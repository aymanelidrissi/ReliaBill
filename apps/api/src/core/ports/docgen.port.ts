export const DOC_GEN = Symbol('DOC_GEN');

export interface DocGenPort {
  renderPdf(input: {
    invoice: any; company: any; client: any; outPath: string;
  }): Promise<void>;
  renderUbl(input: {
    invoice: any; company: any; client: any; outPath: string;
  }): Promise<void>;
}
