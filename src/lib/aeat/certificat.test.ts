import { describe, it, expect } from 'vitest';
import forge from 'node-forge';
import tls from 'node:tls';
import { generateKeyPairSync } from 'node:crypto';
import { llegeixCertificat, nifDeSubjecte, nomDeSubjecte } from './certificat';

/** .p12 de prova amb l'estructura d'un certificat de persona física de la FNMT. */
function p12Prova(contrasenya: string, opts: { caducat?: boolean; algorithm?: '3des' | 'aes128' } = {}): Buffer {
  // Clau de 2048 bits com la FNMT (OpenSSL 3 rebutja les de 1024); generada amb
  // node:crypto perquè la de forge en JS pur és molt lenta.
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const priv = forge.pki.privateKeyFromPem(privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()) as forge.pki.rsa.PrivateKey;
  const keys = { privateKey: priv, publicKey: forge.pki.setRsaPublicKey(priv.n, priv.e) };
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  const ara = Date.now();
  cert.validity.notBefore = new Date(ara - 86_400_000 * 10);
  cert.validity.notAfter = new Date(ara + (opts.caducat ? -86_400_000 : 86_400_000 * 365));
  const subj = [
    { type: '2.5.4.3', value: 'PRUEBA PRUEBA USUARIO - 89890001K' },
    { type: '2.5.4.5', value: 'IDCES-89890001K' },
    { type: '2.5.4.42', value: 'USUARIO' },
    { type: '2.5.4.4', value: 'PRUEBA PRUEBA' },
    { name: 'countryName', value: 'ES' },
  ];
  cert.setSubject(subj);
  cert.setIssuer([{ name: 'commonName', value: 'AC FNMT Usuarios' }, { name: 'organizationName', value: 'FNMT-RCM' }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const der = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], contrasenya, { algorithm: opts.algorithm ?? 'aes128' })).getBytes();
  return Buffer.from(der, 'binary');
}

describe('certificat de la titular', () => {
  const p12 = p12Prova('secret');

  it('extreu NIF, nom i caducitat i el normalitza perquè Node el pugui fer servir', () => {
    const { info, p12: norm } = llegeixCertificat(p12, 'secret');
    expect(info.nif).toBe('89890001K');
    expect(info.nom).toBe('PRUEBA PRUEBA USUARIO');
    expect(info.caduca.getTime()).toBeGreaterThan(Date.now());
    expect(info.emissor).toBe('FNMT-RCM');
    expect(() => tls.createSecureContext({ pfx: norm, passphrase: 'secret' })).not.toThrow();
    // Continua protegit per la mateixa contrasenya.
    expect(() => tls.createSecureContext({ pfx: norm, passphrase: 'una altra' })).toThrow();
  });

  it('contrasenya incorrecta → missatge clar', () => {
    expect(() => llegeixCertificat(p12, 'dolenta')).toThrow(/contrasenya/);
  });

  it('fitxer que no és un .p12', () => {
    expect(() => llegeixCertificat(Buffer.from('hola'), 'x')).toThrow(/no és un certificat/);
  });

  it('certificat caducat', () => {
    expect(() => llegeixCertificat(p12Prova('s', { caducat: true }), 's')).toThrow(/caducar/);
  });

  it('NIF i nom des del subjecte', () => {
    expect(nifDeSubjecte('IDCES-38835174L', undefined)).toBe('38835174L');
    expect(nifDeSubjecte(undefined, 'NUALART COLL ELISABETH - 38835174L')).toBe('38835174L');
    expect(nomDeSubjecte(undefined, undefined, 'NUALART COLL ELISABETH - 38835174L')).toBe('NUALART COLL ELISABETH');
  });
}, 60_000);
