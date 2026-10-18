/**
 * Certificat electrònic de la titular (.p12/.pfx de la FNMT) per a la
 * presentació directa a l'AEAT.
 *
 * En pujar-lo: es llegeix amb la contrasenya (node-forge, que entén també els
 * .p12 antics xifrats amb RC2 que Node/OpenSSL 3 ja no accepta), se n'extreuen
 * el NIF, el nom i la caducitat, i es TORNA A EMPAQUETAR en un .p12 3DES amb la
 * MATEIXA contrasenya — així Node el pot fer servir per al TLS amb l'AEAT. La
 * contrasenya no es desa mai: el .p12 resultant continua protegit per ella.
 */
import forge from 'node-forge';
import tls from 'node:tls';

export interface InfoCertificat {
  nif: string;
  /** «COGNOMS NOM» del titular (FIRNOMBRE de PresBasicaDos). */
  nom: string;
  caduca: Date;
  emissor: string;
}

export class ErrorCertificat extends Error {}

/** Tipus de «bossa» PKCS#12 (RFC 7292): clau xifrada, clau i certificat. */
const BAG = {
  clauXifrada: '1.2.840.113549.1.12.10.1.2',
  clau: '1.2.840.113549.1.12.10.1.1',
  certificat: '1.2.840.113549.1.12.10.1.3',
} as const;

/** Atributs X.500 del subjecte per OID (forge no en coneix tots pel nom). */
const OID = { cn: '2.5.4.3', serialNumber: '2.5.4.5', surname: '2.5.4.4', givenName: '2.5.4.42' } as const;
const attr = (c: forge.pki.Certificate, k: keyof typeof OID) =>
  c.subject.getField({ type: OID[k] })?.value as string | undefined;

/** NIF del titular a partir del «serialNumber» (IDCES-12345678Z) o del CN. */
export function nifDeSubjecte(serial: string | undefined, cn: string | undefined): string | null {
  const net = (s: string) => s.toUpperCase().replace(/^IDC[A-Z]{2}-/, '').replace(/[^0-9A-Z]/g, '');
  const candidats = [serial ? net(serial) : '', ...(cn?.toUpperCase().match(/[0-9XYZ][0-9]{7}[A-Z]/g) ?? [])];
  return candidats.find((s) => /^[0-9XYZ][0-9]{7}[A-Z]$/.test(s)) ?? null;
}

/** «COGNOMS NOM» a partir del cognom i el nom del subjecte o, si no n'hi ha, del CN. */
export function nomDeSubjecte(cognoms: string | undefined, nom: string | undefined, cn: string | undefined): string {
  if (cognoms && nom) return `${cognoms} ${nom}`.toUpperCase().trim();
  // CN de la FNMT: «COGNOM1 COGNOM2 NOM - 12345678Z»
  return (cn ?? '').replace(/\s+-\s+[0-9XYZ][0-9]{7}[A-Z].*$/i, '').toUpperCase().trim();
}

/**
 * Llegeix el .p12 amb la contrasenya, en torna les dades i el .p12 normalitzat
 * (3DES) que Node pot fer servir. Llença ErrorCertificat amb un missatge clar.
 */
export function llegeixCertificat(p12: Buffer, contrasenya: string): { info: InfoCertificat; p12: Buffer } {
  let obj: forge.pkcs12.Pkcs12Pfx;
  try {
    obj = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(p12.toString('binary'))), false, contrasenya);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/password|mac|decrypt/i.test(msg)) throw new ErrorCertificat('La contrasenya del certificat no és correcta');
    throw new ErrorCertificat('El fitxer no és un certificat .p12/.pfx vàlid');
  }

  const bossa = (oid: string): forge.pkcs12.Bag[] => obj.getBags({ bagType: oid })[oid] ?? [];
  const claus = [...bossa(BAG.clauXifrada), ...bossa(BAG.clau)];
  const certs = bossa(BAG.certificat)
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c);
  const clau = claus.find((k) => k.key)?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!clau || certs.length === 0) throw new ErrorCertificat('El .p12 no conté la clau privada i el certificat');

  // Certificat de la titular: el que correspon a la clau privada.
  const titular =
    certs.find((c) => (c.publicKey as forge.pki.rsa.PublicKey).n?.equals(clau.n)) ?? certs[0]!;
  const cn = attr(titular, 'cn');
  const nif = nifDeSubjecte(attr(titular, 'serialNumber'), cn);
  if (!nif) throw new ErrorCertificat('No s’ha trobat el NIF al certificat (ha de ser de persona física)');
  const caduca = titular.validity.notAfter;
  if (caduca.getTime() < Date.now()) throw new ErrorCertificat(`El certificat va caducar el ${caduca.toLocaleDateString('es-ES')}`);

  const cadena = [titular, ...certs.filter((c) => c !== titular)];
  const der = forge.asn1
    .toDer(forge.pkcs12.toPkcs12Asn1(clau, cadena, contrasenya, { algorithm: '3des', friendlyName: nif }))
    .getBytes();
  const normalitzat = Buffer.from(der, 'binary');

  // Comprovació final: Node/OpenSSL ha de poder obrir-lo per al TLS amb l'AEAT.
  try {
    tls.createSecureContext({ pfx: normalitzat, passphrase: contrasenya });
  } catch {
    throw new ErrorCertificat('El certificat no es pot fer servir per connectar amb l’AEAT');
  }

  return {
    info: {
      nif,
      nom: nomDeSubjecte(attr(titular, 'surname'), attr(titular, 'givenName'), cn),
      caduca,
      emissor: (titular.issuer.getField('O')?.value as string | undefined) ?? (titular.issuer.getField('CN')?.value as string | undefined) ?? '',
    },
    p12: normalitzat,
  };
}
