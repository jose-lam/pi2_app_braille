import { Request, Response, NextFunction } from 'express';

// Token secreto por defecto o configurado en variables de entorno
const DEFAULT_TOKEN = 'MI_TOKEN_SECRETO_123';

export function getExpectedToken(): string {
  return process.env.ESP32_SECRET_TOKEN || DEFAULT_TOKEN;
}

export function getAllowedIp(): string {
  return (process.env.ALLOWED_IP || '').trim();
}

/**
 * Middleware de seguridad:
 * 1. Valida el encabezado HTTP X-ESP32-Token
 * 2. Opcionalmente verifica la IP del cliente si ALLOWED_IP está configurada
 */
export function validateEsp32Token(req: Request, res: Response, next: NextFunction) {
  const expectedToken = getExpectedToken();
  const allowedIp = getAllowedIp();

  // 1. Verificación opcional de IP permitida
  if (allowedIp) {
    const rawClientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      req.ip ||
      '';

    // Normalizar IPs tipo IPv4-mapped IPv6 (::ffff:192.168.1.100 -> 192.168.1.100)
    const clientIp = rawClientIp.replace(/^.*:/, '');

    if (clientIp !== allowedIp && rawClientIp !== allowedIp && allowedIp !== '*') {
      return res.status(403).json({
        error: 'Acceso Denegado: IP no autorizada',
        clientIp: clientIp,
        allowedIpConfigured: allowedIp,
        message: 'La IP de origen no coincide con la configurada en ALLOWED_IP.',
      });
    }
  }

  // 2. Verificación de Token / API Key en el encabezado HTTP
  const receivedToken = req.headers['x-esp32-token'] || req.headers['x-api-key'];

  if (!receivedToken) {
    return res.status(401).json({
      error: 'No autorizado: Falta encabezado de autenticación',
      expectedHeader: 'X-ESP32-Token',
      message: 'Debe incluir el encabezado HTTP "X-ESP32-Token" con la clave configurada.',
    });
  }

  if (receivedToken !== expectedToken) {
    return res.status(401).json({
      error: 'No autorizado: Token inválido',
      message: 'El valor de X-ESP32-Token no coincide con el token del sistema.',
    });
  }

  // Validación exitosa
  next();
}
