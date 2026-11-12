import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import { ChildService } from './child.service';

// Duración del permiso temporal de visualización (en minutos)
export const SHARE_TTL_MINUTES = 60;

// Clave para firmar los enlaces. En producción debe venir de una variable de entorno.
const SHARE_SECRET = process.env.SHARE_SECRET ?? 'pinapp-maternidad-share-secret';

/**
 * Comparte el perfil de un hijo mediante un enlace temporal firmado.
 * El token contiene el id del hijo y la fecha de caducidad, firmados con HMAC,
 * por lo que no hace falta guardarlo en base de datos: si alguien lo manipula
 * o ha caducado, se rechaza.
 */
@Injectable()
export class ChildShareService {
  constructor(private readonly childService: ChildService) {}

  async createShare(childId: number, baseUrl: string) {
    // Comprueba que el hijo existe antes de generar el enlace
    await this.childService.getDashboardData(childId);

    const expiresAt = new Date(Date.now() + SHARE_TTL_MINUTES * 60 * 1000);
    const payload = Buffer.from(`${childId}.${expiresAt.getTime()}`).toString('base64url');
    const token = `${payload}.${this.sign(payload)}`;
    const url = `${baseUrl}/share/${token}`;
    const qr = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: '#302e2c', light: '#ffffff' },
    });

    return { url, qr, expiresAt: expiresAt.toISOString() };
  }

  /** Valida el token y devuelve el id del hijo y su caducidad. */
  verifyToken(token: string) {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) throw new UnauthorizedException('Enlace no válido');

    const expected = Buffer.from(this.sign(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException('Enlace no válido');
    }

    const [childId, expiresAt] = Buffer.from(payload, 'base64url').toString().split('.').map(Number);
    if (!childId || !expiresAt || Date.now() > expiresAt) {
      throw new UnauthorizedException('El enlace ha caducado');
    }
    return { childId, expiresAt: new Date(expiresAt) };
  }

  private sign(payload: string) {
    return createHmac('sha256', SHARE_SECRET).update(payload).digest('base64url');
  }
}
