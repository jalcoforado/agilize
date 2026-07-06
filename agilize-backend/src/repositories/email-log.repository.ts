import db from '../db/connection';

interface EmailLogInsert {
  destinatario: string;
  assunto: string;
  status: 'enviado' | 'falha';
  tentativas: number;
  erro?: string | null;
}

export async function inserirEmailLog(data: EmailLogInsert): Promise<void> {
  await db('email_logs').insert({
    destinatario: data.destinatario,
    assunto: data.assunto,
    status: data.status,
    tentativas: data.tentativas,
    erro: data.erro ?? null,
  });
}

export async function listarEmailLogs(
  { pagina = 1, limite = 50 }: { pagina?: number; limite?: number } = {}
) {
  const total = (await db('email_logs').count('* as count').first()) as { count: string };
  const logs = await db('email_logs')
    .orderBy('criado_em', 'desc')
    .limit(limite)
    .offset((pagina - 1) * limite);

  return {
    logs,
    total: parseInt(total.count),
    pagina,
    limite,
    totalPaginas: Math.ceil(parseInt(total.count) / limite),
  };
}
