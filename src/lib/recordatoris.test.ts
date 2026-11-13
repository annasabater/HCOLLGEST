import { describe, expect, it } from 'vitest';
import {
  diaMadrid,
  diesEntre,
  horaMadrid,
  horaMinutMadrid,
  HORES_RECORDATORI,
  notificacioRecordatori,
  notificacioResum,
  textHora,
  tocaAvisAHora,
  primerAvis,
  resumBuit,
  seguentData,
  textDiesAbans,
  textQuan,
  textRepeticio,
  textResum,
  tocaAra,
  tocaWhatsapp,
  type RecordatoriDates,
} from './recordatoris';

const r = (p: Partial<RecordatoriDates> = {}): RecordatoriDates => ({
  data: '2026-12-15',
  diesAbans: [30, 7],
  whatsapp: true,
  ajornatFins: null,
  fet: false,
  ...p,
});

describe('hora pròpia', () => {
  const h = (p: Partial<RecordatoriDates & { hora: string | null; avisatDia: string | null }> = {}) => ({
    ...r(),
    hora: '20:00' as string | null,
    avisatDia: null as string | null,
    ...p,
  });
  it('hora de Madrid amb minuts', () => {
    expect(horaMinutMadrid(new Date('2026-12-01T19:05:00Z'))).toBe('20:05');
    expect(horaMinutMadrid(new Date('2026-07-01T18:30:00Z'))).toBe('20:30');
  });
  it('avisa el dia que toca a partir de l’hora, un sol cop', () => {
    expect(tocaAvisAHora(h(), '2026-12-08', '19:50')).toBe(false);
    expect(tocaAvisAHora(h(), '2026-12-08', '20:00')).toBe(true);
    expect(tocaAvisAHora(h(), '2026-12-08', '22:10')).toBe(true);
    expect(tocaAvisAHora(h({ avisatDia: '2026-12-08' }), '2026-12-08', '22:10')).toBe(false);
    expect(tocaAvisAHora(h(), '2026-12-09', '20:00')).toBe(false); // no és dia d'avís
    expect(tocaAvisAHora(h({ hora: null }), '2026-12-08', '20:00')).toBe(false); // va al resum
  });
  it('hores i text', () => {
    expect(HORES_RECORDATORI[0]).toBe('07:00');
    expect(HORES_RECORDATORI.at(-1)).toBe('23:30');
    expect(textHora('20:00')).toBe('a les 20:00');
    expect(textHora('09:30')).toBe('a les 9:30');
    expect(notificacioRecordatori({ titol: 'Assegurança', data: '2026-12-15', notes: null }, '2026-12-15').body).toBe('És avui');
  });
});

describe('dates', () => {
  it('dia i hora de Madrid', () => {
    expect(diaMadrid(new Date('2026-11-12T23:30:00Z'))).toBe('2026-11-13'); // hivern UTC+1
    expect(horaMadrid(new Date('2026-07-01T07:10:00Z'))).toBe(9); // estiu UTC+2
    expect(horaMadrid(new Date('2026-12-01T08:10:00Z'))).toBe(9);
  });
  it('diesEntre', () => {
    expect(diesEntre('2026-11-15', '2026-12-15')).toBe(30);
    expect(diesEntre('2026-03-28', '2026-03-30')).toBe(2); // canvi d'hora
  });
  it('seguentData no salta de mes', () => {
    expect(seguentData('2026-12-15', 1, 'ANYS')).toBe('2027-12-15');
    expect(seguentData('2027-01-31', 1, 'MESOS')).toBe('2027-02-28');
    expect(seguentData('2028-02-29', 1, 'ANYS')).toBe('2029-02-28');
    expect(seguentData('2026-11-30', 3, 'MESOS')).toBe('2027-02-28');
    expect(seguentData('2026-12-28', 2, 'SETMANES')).toBe('2027-01-11');
    expect(seguentData('2026-10-12', 2, 'ANYS')).toBe('2028-10-12');
  });
});

describe('tauler', () => {
  it('surt des del primer avís fins que és fet', () => {
    expect(primerAvis(r())).toBe('2026-11-15');
    expect(tocaAra(r(), '2026-11-14')).toBe(false);
    expect(tocaAra(r(), '2026-11-15')).toBe(true);
    expect(tocaAra(r(), '2027-01-10')).toBe(true); // vençut i no fet
    expect(tocaAra(r({ fet: true }), '2026-12-01')).toBe(false);
  });
  it('ajornat no surt fins al dia', () => {
    expect(tocaAra(r({ ajornatFins: '2026-12-10' }), '2026-12-09')).toBe(false);
    expect(tocaAra(r({ ajornatFins: '2026-12-10' }), '2026-12-10')).toBe(true);
  });
  it('sense dies abans: el mateix dia', () => {
    expect(tocaAra(r({ diesAbans: [] }), '2026-12-14')).toBe(false);
    expect(tocaAra(r({ diesAbans: [] }), '2026-12-15')).toBe(true);
  });
});

describe('whatsapp', () => {
  it('els dies d’avís i el mateix dia', () => {
    expect(tocaWhatsapp(r(), '2026-11-15')).toBe(true);
    expect(tocaWhatsapp(r(), '2026-11-16')).toBe(false);
    expect(tocaWhatsapp(r(), '2026-12-08')).toBe(true);
    expect(tocaWhatsapp(r(), '2026-12-15')).toBe(true);
  });
  it('vençut: un cop per setmana', () => {
    expect(tocaWhatsapp(r(), '2026-12-16')).toBe(false);
    expect(tocaWhatsapp(r(), '2026-12-22')).toBe(true);
    expect(tocaWhatsapp(r(), '2026-12-29')).toBe(true);
  });
  it('ajornat: calla fins al dia i llavors avisa', () => {
    const a = r({ ajornatFins: '2026-12-18' });
    expect(tocaWhatsapp(a, '2026-12-15')).toBe(false);
    expect(tocaWhatsapp(a, '2026-12-18')).toBe(true);
    expect(tocaWhatsapp(a, '2026-12-25')).toBe(true);
  });
  it('sense WhatsApp o fet: res', () => {
    expect(tocaWhatsapp(r({ whatsapp: false }), '2026-12-15')).toBe(false);
    expect(tocaWhatsapp(r({ fet: true }), '2026-12-15')).toBe(false);
  });
});

describe('textos', () => {
  it('quan', () => {
    expect(textQuan(0)).toBe('avui');
    expect(textQuan(1)).toBe('demà');
    expect(textQuan(7)).toBe('d’aquí a 7 dies');
    expect(textQuan(-3)).toBe('fa 3 dies');
  });
  it('repetició', () => {
    expect(textRepeticio(null, null)).toBe('Un sol cop');
    expect(textRepeticio(1, 'ANYS')).toBe('Cada any');
    expect(textRepeticio(3, 'MESOS')).toBe('Cada 3 mesos');
    expect(textRepeticio(2, 'SETMANES')).toBe('Cada 2 setmanes');
  });
  it('dies abans', () => {
    expect(textDiesAbans([7, 30])).toBe('30 i 7 dies abans');
    expect(textDiesAbans([1])).toBe('1 dia abans');
    expect(textDiesAbans([0])).toBe('el mateix dia');
    expect(textDiesAbans([15, 0])).toBe('15 dies abans i el mateix dia');
    expect(textDiesAbans([30, 15, 7])).toBe('30, 15 i 7 dies abans');
  });
  it('resum', () => {
    const res = {
      dia: '2026-12-08',
      recordatoris: [{ titol: 'Renovar l’assegurança', data: '2026-12-15', notes: 'Mapfre' }],
      cobraments: [{ titular: 'Cesar Pérez', import: 450, data: '2026-12-09', concepte: null }],
      sortides: [{ titular: 'Nina M', habitacio: '4', data: '2026-12-08' }],
      opinions: [],
    };
    const t = textResum(res, 'https://gestio.hostalcoll.com/');
    expect(t).toContain('*Hostal Coll · 08/12/2026*');
    expect(t).toContain('• Renovar l’assegurança — És el 15/12/2026 (d’aquí a 7 dies)\n  Mapfre');
    expect(t).toContain('• Nina M (hab. 4) — surt avui');
    expect(t).toContain('• Cesar Pérez · 450 € — paga demà');
    expect(t).not.toContain('Opinions');
    expect(t.endsWith('https://gestio.hostalcoll.com/recordatoris')).toBe(true);
    expect(resumBuit({ ...res, recordatoris: [], cobraments: [], sortides: [] })).toBe(true);
  });
  it('notificació curta', () => {
    const n = notificacioResum({
      dia: '2026-12-08',
      recordatoris: [{ titol: 'Assegurança', data: '2026-12-15', notes: null }],
      cobraments: [{ titular: 'Cesar', import: 450, data: '2026-12-09', concepte: null }],
      sortides: [{ titular: 'Nina', habitacio: '4', data: '2026-12-08' }],
      opinions: [
        { autor: 'A', puntuacio: 5, tipus: 'GOOGLE' },
        { autor: 'B', puntuacio: 4, tipus: 'VALORACIO' },
      ],
    });
    expect(n.title).toBe('Bon dia: 5 coses per avui');
    expect(n.body.split('\n')).toEqual([
      'Sortida: Nina (hab. 4) avui',
      'Cobrament: Cesar · 450 € demà',
      'Recordatori: Assegurança (d’aquí a 7 dies)',
      'i 2 més…',
    ]);
  });
});
