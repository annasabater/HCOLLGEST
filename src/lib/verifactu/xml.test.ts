import { describe, it, expect } from 'vitest';
import {
  xmlEscape,
  buildRegistroAltaXml,
  buildRegFactuEnvelope,
  parseAeatResponse,
  type RegistroAltaXmlInput,
} from './xml';

const base: RegistroAltaXmlInput = {
  idEmisor: '40331905W',
  nomEmisor: 'HOSTAL COLL',
  numSerieFactura: 'FAC-2026-0001',
  fechaExpedicion: '21-06-2026',
  tipoFactura: 'F1',
  descripcio: 'Allotjament',
  nifDestinatari: '12345678Z',
  nomDestinatari: 'Maria Garcia',
  base: 100,
  tipusIva: 10,
  quotaIva: 10,
  importNoSubjecte: 0,
  quotaTotal: 10,
  importeTotal: 110,
  fechaHoraHuso: '2026-06-21T19:20:30+02:00',
  huella: 'ABC123',
  anterior: null,
};

describe('xmlEscape', () => {
  it('escapa caràcters especials', () => {
    expect(xmlEscape('a & b < c > "d" \'e\'')).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;');
  });
});

describe('buildRegistroAltaXml', () => {
  it('inclou els camps clau i el primer registre', () => {
    const xml = buildRegistroAltaXml(base);
    expect(xml).toContain('<sum1:IDEmisorFactura>40331905W</sum1:IDEmisorFactura>');
    expect(xml).toContain('<sum1:NumSerieFactura>FAC-2026-0001</sum1:NumSerieFactura>');
    expect(xml).toContain('<sum1:TipoFactura>F1</sum1:TipoFactura>');
    expect(xml).toContain('<sum1:Huella>ABC123</sum1:Huella>');
    expect(xml).toContain('<sum1:PrimerRegistro>S</sum1:PrimerRegistro>');
    expect(xml).toContain('<sum1:Destinatarios>');
    expect(xml).toContain('<sum1:CuotaTotal>10.00</sum1:CuotaTotal>');
    expect(xml).toContain('<sum1:ImporteTotal>110.00</sum1:ImporteTotal>');
  });

  it('encadena amb el registre anterior', () => {
    const xml = buildRegistroAltaXml({
      ...base,
      anterior: {
        idEmisor: '40331905W',
        numSerieFactura: 'FAC-2026-0000',
        fechaExpedicion: '20-06-2026',
        huella: 'PREV999',
      },
    });
    expect(xml).toContain('<sum1:RegistroAnterior>');
    expect(xml).toContain('<sum1:Huella>PREV999</sum1:Huella>');
    expect(xml).not.toContain('PrimerRegistro');
  });

  it('afegeix detall no subjecte quan hi ha import no subjecte (IEET)', () => {
    const xml = buildRegistroAltaXml({ ...base, importNoSubjecte: 12 });
    expect(xml).toContain('<sum1:CalificacionOperacion>N1</sum1:CalificacionOperacion>');
    expect(xml).toContain('<sum1:BaseImponibleOimporteNoSujeto>12.00</sum1:BaseImponibleOimporteNoSujeto>');
  });

  it('F2 no inclou destinatari', () => {
    const xml = buildRegistroAltaXml({ ...base, tipoFactura: 'F2' });
    expect(xml).not.toContain('<sum1:Destinatarios>');
  });
});

describe('buildRegFactuEnvelope', () => {
  it('embolcalla amb cabecera i registres', () => {
    const env = buildRegFactuEnvelope(
      { nifEmisor: '40331905W', nomEmisor: 'HOSTAL COLL' },
      [buildRegistroAltaXml(base)],
    );
    expect(env).toContain('<sum:RegFactuSistemaFacturacion>');
    expect(env).toContain('<sum1:ObligadoEmision>');
    expect(env).toContain('<sum1:NIF>40331905W</sum1:NIF>');
    expect(env).toContain('<sum:RegistroFactura>');
    expect(env).toContain('soapenv:Envelope');
  });
});

describe('parseAeatResponse', () => {
  it('extrau estat, CSV i errors (amb prefix de namespace)', () => {
    const xml = `<env:Envelope><env:Body><tikR:RespuestaRegFactuSistemaFacturacion>
      <tikR:EstadoEnvio>Correcto</tikR:EstadoEnvio>
      <tikR:RespuestaLinea><tikR:EstadoRegistro>Correcto</tikR:EstadoRegistro>
      <tikR:CSV>ABCDEF123456</tikR:CSV></tikR:RespuestaLinea>
      </tikR:RespuestaRegFactuSistemaFacturacion></env:Body></env:Envelope>`;
    const r = parseAeatResponse(xml);
    expect(r.estadoEnvio).toBe('Correcto');
    expect(r.estadoRegistro).toBe('Correcto');
    expect(r.csv).toBe('ABCDEF123456');
  });
});
