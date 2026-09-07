export function validateEnvironment(input: Record<string, unknown>) {
  const nodeEnv = String(input.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const port = Number(input.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const databaseUrl = String(input.DATABASE_URL ?? '');
  try {
    const parsed = new URL(databaseUrl);
    if (
      !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !parsed.hostname
    ) {
      throw new Error();
    }
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }

  const origins = String(
    input.CORS_ORIGINS ??
      (nodeEnv === 'production' ? '' : 'http://localhost:3000'),
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin)
        throw new Error();
    } catch {
      throw new Error(
        'CORS_ORIGINS must contain comma-separated HTTP(S) origins without trailing slashes',
      );
    }
  }

  const swagger = String(input.SWAGGER_ENABLED ?? nodeEnv !== 'production');
  if (!['true', 'false'].includes(swagger)) {
    throw new Error('SWAGGER_ENABLED must be true or false');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    CORS_ORIGINS: origins,
    SWAGGER_ENABLED: swagger === 'true',
  };
}
