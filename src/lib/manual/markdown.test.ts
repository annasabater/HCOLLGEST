import { describe, expect, it } from 'vitest';
import { parseMarkdown, parseInline, slugify, treuSeccionsInternes } from './markdown';

describe('manual · markdown', () => {
  it('fa slugs sense accents', () => {
    expect(slugify('Com faig una factura rectificativa?')).toBe('com-faig-una-factura-rectificativa');
    expect(slugify('Fiança · dipòsit')).toBe('fianca-diposit');
  });

  it('llegeix negretes, codi i enllaços', () => {
    expect(parseInline('Prem **«Desar»** i ves a [Factures](/factures)')).toEqual([
      { t: 'text', v: 'Prem ' },
      { t: 'b', c: [{ t: 'text', v: '«Desar»' }] },
      { t: 'text', v: ' i ves a ' },
      { t: 'link', href: '/factures', c: [{ t: 'text', v: 'Factures' }] },
    ]);
  });

  it('manté la numeració dels passos després d’una foto', () => {
    const b = parseMarkdown(
      '1. Obre l’estada.\n2. Prem «Factura».\n[FOTO id=f1 ruta=/estancies descripcio="La fitxa" marques="Factura|Desar"]\n3. Desa.\n',
    );
    expect(b.map((x) => x.t)).toEqual(['list', 'foto', 'list']);
    expect(b[2]).toMatchObject({ t: 'list', ordered: true, start: 3 });
    expect(b[1]).toMatchObject({ foto: { id: 'f1', ruta: '/estancies', descripcio: 'La fitxa', marques: ['Factura', 'Desar'] } });
  });

  it('llegeix taules i subllistes', () => {
    const b = parseMarkdown('| A | B |\n|---|---|\n| 1 | 2 |\n\n- u\n  - dos\n- tres\n');
    expect(b[0]).toMatchObject({ t: 'table', rows: [[[{ t: 'text', v: '1' }], [{ t: 'text', v: '2' }]]] });
    expect(b[1]).toMatchObject({ t: 'list', items: [{ sub: { items: [{ c: [{ t: 'text', v: 'dos' }] }] } }, {}] });
  });

  it('treu la secció de DUBTES', () => {
    expect(treuSeccionsInternes('# T\n## A\nx\n## DUBTES\n- intern\n')).toBe('# T\n## A\nx\n');
  });
});
