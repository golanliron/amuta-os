declare module 'pdf-parse' {
  interface PDFResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    text: string;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PDFResult>;
  export default pdfParse;
}
