/** Cálculo puro de antigüedad y alertas de un activo (testeable). */
import type { EstatActiu } from '@prisma/client';

export interface ActiuInfoInput {
  dataCompra: Date;
  garantiaFins?: Date | null;
  estat: EstatActiu;
}

export interface ActiuInfo {
  anysAntiguitat: number; // años (1 decimal)
  garantiaVencuda: boolean;
  garantiaProxima: boolean; // vence en ≤ 30 días
  alerta: boolean;
  motiu: string | null;
}

const DIA = 86_400_000;

export function computeActiuInfo(input: ActiuInfoInput, now: Date): ActiuInfo {
  const anysAntiguitat = Math.round(((now.getTime() - input.dataCompra.getTime()) / (365.25 * DIA)) * 10) / 10;

  let garantiaVencuda = false;
  let garantiaProxima = false;
  if (input.garantiaFins) {
    const ms = input.garantiaFins.getTime() - now.getTime();
    if (ms < 0) garantiaVencuda = true;
    else if (ms <= 30 * DIA) garantiaProxima = true;
  }

  let motiu: string | null = null;
  if (input.estat === 'OBSOLET') motiu = 'Actiu obsolet';
  else if (input.estat === 'SUBSTITUCIO_RECOMANADA') motiu = 'Substitució recomanada';
  else if (garantiaProxima) motiu = 'Garantia a punt de vèncer';
  else if (garantiaVencuda) motiu = 'Garantia vençuda';

  return {
    anysAntiguitat,
    garantiaVencuda,
    garantiaProxima,
    alerta: motiu !== null,
    motiu,
  };
}
