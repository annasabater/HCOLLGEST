/**
 * Veri*Factu — client d'enviament a l'AEAT (servei SOAP RegFactuSistemaFacturacion).
 * Autenticació per TLS client amb certificat (.pfx). Llegeix el cert d'env.
 *
 * Si no hi ha certificat configurat → AeatNotConfiguredError (el flux d'enviament
 * queda inactiu; els registres ja s'encadenen en local).
 */
import 'server-only';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import { getAeatCertConfig } from '../env';
import { VERIFACTU_SOAP_PROD, VERIFACTU_SOAP_TEST } from './software';
import { parseAeatResponse } from './xml';

export class AeatNotConfiguredError extends Error {
  constructor() {
    super(
      'Enviament a l’AEAT inactiu: falta el certificat (AEAT_CERT_PFX_PATH). ' +
        'El registre Veri*Factu s’ha generat i encadenat en local; configura el ' +
        'certificat per enviar-lo a l’AEAT.',
    );
    this.name = 'AeatNotConfiguredError';
  }
}

export interface AeatSendResult {
  ok: boolean;
  estadoEnvio: string | null;
  estadoRegistro: string | null;
  csv: string | null;
  codigoError: string | null;
  descripcionError: string | null;
  raw: string;
}

function postSoap(
  url: URL,
  body: string,
  pfx: Buffer,
  passphrase: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: url.pathname + url.search,
        method: 'POST',
        pfx,
        passphrase,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: '',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function enviarRegFactu(envelopeXml: string, testMode: boolean): Promise<AeatSendResult> {
  const cfg = getAeatCertConfig();
  if (!cfg) throw new AeatNotConfiguredError();

  const pfx = await readFile(cfg.pfxPath);
  const url = new URL(testMode ? VERIFACTU_SOAP_TEST : VERIFACTU_SOAP_PROD);
  const raw = await postSoap(url, envelopeXml, pfx, cfg.passphrase);
  const parsed = parseAeatResponse(raw);

  const estado = parsed.estadoRegistro ?? parsed.estadoEnvio;
  const ok = estado === 'Correcto' || estado === 'AceptadoConErrores';

  return { ok, ...parsed, raw };
}
