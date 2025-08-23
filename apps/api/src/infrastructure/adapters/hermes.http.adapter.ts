import { Injectable } from '@nestjs/common';
import { HermesPort } from '../../core/ports/hermes.port';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class HttpHermesAdapter implements HermesPort {
  async send({ xmlPath }: { xmlPath: string }) {
    if (!fs.existsSync(xmlPath)) throw new Error('XML_NOT_FOUND');
    const buf = fs.readFileSync(xmlPath);
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
    return { messageId: `hermes_${hash}`, delivered: false };
  }
}
