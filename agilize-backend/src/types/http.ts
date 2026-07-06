// Formato de erro usado em toda a aplicação. O middleware de erro central
// (src/index.ts) inspeciona statusCode/code/validation/details.
export interface HttpError extends Error {
  statusCode?: number;
  code?: string;
  validation?: boolean;
  details?: Array<{ campo: string | number | undefined; mensagem: string }>;
}
