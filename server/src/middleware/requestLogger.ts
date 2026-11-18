import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that logs every incoming HTTP request and its completion status to the console.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim()
    || req.socket.remoteAddress
    || req.ip
    || '-';

  console.log(`[HTTP] --> ${method} ${url} | IP: ${clientIp} | ${timestamp}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const user = req.user ? `${req.user.email} (${req.user.role})` : 'unauthenticated';
    console.log(
      `[HTTP] <-- ${method} ${url} ${statusCode} | ${duration}ms | User: ${user}`
    );
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      const duration = Date.now() - start;
      console.log(
        `[HTTP] -x- ${method} ${url} CLOSED/ABORTED | ${duration}ms`
      );
    }
  });

  next();
}
