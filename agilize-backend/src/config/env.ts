const OBRIGATORIAS_BASE = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'] as const;

export function variaveisObrigatoriasAusentes(env: NodeJS.ProcessEnv): string[] {
  const obrigatorias: string[] = [...OBRIGATORIAS_BASE];

  if (env.SMTP_ENABLED === 'true') {
    obrigatorias.push('SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD');
  }

  if (env.NODE_ENV === 'production') {
    obrigatorias.push('FRONTEND_URL');
  }

  // eslint-disable-next-line security/detect-object-injection
  return obrigatorias.filter((chave) => !env[chave]);
}
