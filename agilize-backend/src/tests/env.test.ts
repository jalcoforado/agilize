import { variaveisObrigatoriasAusentes } from '../config/env';

describe('variaveisObrigatoriasAusentes', () => {
  const base = {
    DB_HOST: 'localhost',
    DB_USER: 'user',
    DB_PASSWORD: 'pass',
    DB_NAME: 'db',
    JWT_SECRET: 'secret',
  } as NodeJS.ProcessEnv;

  it('retorna vazio quando todas as obrigatórias básicas estão presentes', () => {
    expect(variaveisObrigatoriasAusentes(base)).toEqual([]);
  });

  it('acusa a variável básica ausente', () => {
    const env = { ...base, JWT_SECRET: '' } as NodeJS.ProcessEnv;
    expect(variaveisObrigatoriasAusentes(env)).toEqual(['JWT_SECRET']);
  });

  it('exige SMTP_HOST, SMTP_USER e SMTP_PASSWORD quando SMTP_ENABLED=true', () => {
    const env = { ...base, SMTP_ENABLED: 'true' } as NodeJS.ProcessEnv;
    expect(variaveisObrigatoriasAusentes(env)).toEqual(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']);
  });

  it('não exige SMTP quando SMTP_ENABLED não é "true"', () => {
    const env = { ...base, SMTP_ENABLED: 'false' } as NodeJS.ProcessEnv;
    expect(variaveisObrigatoriasAusentes(env)).toEqual([]);
  });

  it('exige FRONTEND_URL quando NODE_ENV=production', () => {
    const env = { ...base, NODE_ENV: 'production' } as NodeJS.ProcessEnv;
    expect(variaveisObrigatoriasAusentes(env)).toEqual(['FRONTEND_URL']);
  });

  it('não exige FRONTEND_URL fora de produção', () => {
    const env = { ...base, NODE_ENV: 'development' } as NodeJS.ProcessEnv;
    expect(variaveisObrigatoriasAusentes(env)).toEqual([]);
  });
});
