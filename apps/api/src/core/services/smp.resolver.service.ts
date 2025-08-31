import { Injectable } from '@nestjs/common';

export type PeppolParticipant = { scheme: string; id: string };
export type PeppolRouting = {
  participant: PeppolParticipant;
  processId: string;
  documentTypeId: string;
};

@Injectable()
export class SmpResolverService {
  resolveParticipant(input: { peppolScheme?: string | null; peppolId?: string | null }): PeppolParticipant | null {
    const scheme = (input.peppolScheme || '').trim() || 'iso6523-actorid-upis';
    const id = (input.peppolId || '').trim();
    if (!id) return null;
    return { scheme, id };
  }

  resolveRouting(participant: PeppolParticipant): PeppolRouting {
    return {
      participant,
      processId: 'urn:fdc:peppol.eu:2017:poacc:billing:3.0',
      documentTypeId: 'urn:cen.eu:en16931:2017',
    };
  }
}
