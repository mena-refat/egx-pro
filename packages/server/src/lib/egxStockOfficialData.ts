/**
 * بيانات رسمية للأسهم من الإيرادات:
 * قطاع GICS (1–11) + متوافق مع الشريعة (نعم/لا).
 * المصدر: جدول المستخدم — يُحدَّث عند استلام بيانات جديدة.
 */

import { GicsSector } from '@prisma/client';

const GICS_BY_NUM: Record<number, GicsSector> = {
  1: GicsSector.INFORMATION_TECHNOLOGY,
  2: GicsSector.HEALTH_CARE,
  3: GicsSector.FINANCIALS,
  4: GicsSector.CONSUMER_DISCRETIONARY,
  5: GicsSector.CONSUMER_STAPLES,
  6: GicsSector.ENERGY,
  7: GicsSector.INDUSTRIALS,
  8: GicsSector.MATERIALS,
  9: GicsSector.UTILITIES,
  10: GicsSector.REAL_ESTATE,
  11: GicsSector.COMMUNICATION_SERVICES,
};

/** الرمز → رقم قطاع GICS (1–11) من الجدول الرسمي */
const OFFICIAL_GICS_NUM: Record<string, number> = {
  ABUK: 8, ADIB: 3, ACRO: 7, APPC: 2, AJWA: 5, SAUD: 3, FNAR: 7, AMPI: 1, ATLC: 3,
  ALEXA: 8, ALCN: 7, AFMC: 5, AMOC: 6, ANFI: 3, AMES: 2, AXPH: 2, SPIN: 4, AMEC: 2,
  AMER: 10, ALUM: 8, CERA: 8, ACGC: 7, AMIA: 3, ADCI: 2, APSW: 4, RREI: 10, ARVA: 7,
  AIND: 3, ARCC: 8, ASCM: 8, AITG: 3, ALRA: 5, BIGP: 4, BTFH: 3, BCAP: 3, BSFR: 10,
  CIRF: 10, CAED: 4, COSG: 5, CPCI: 2, POUL: 5, CSAG: 7, PRCL: 8, CCAP: 3, CCAPP: 3,
  COMI: 3, CIEB: 3, DCRC: 10, DTPP: 7, DEIN: 3, SUGR: 5, DAPH: 10, DSCW: 4, EDFM: 5,
  EAST: 5, EFID: 5, HRHO: 3, EGX30ETF: 3, EGAL: 8, EPCO: 5, MISR: 8, ESAC: 11, EASB: 3,
  EGCH: 8, OREG: 11, EFIC: 8, EDBM: 7, EGTS: 4, EGBE: 3, PHAR: 2, EITP: 4, IRON: 8,
  EKHO: 3, MPRC: 11, MOED: 4, AREH: 10, AREHA: 10, EGSA: 11, ESGI: 5, ETRS: 7, ABRD: 3,
  EIUD: 10, EHDR: 10, AFDI: 3, EPPK: 7, EEII: 7, EALR: 7, EBDP: 7, ICFC: 8, IRAX: 8,
  ECAP: 8, KWIN: 3, ELKA: 10, KABO: 4, ELNA: 5, NASR: 7, OBRI: 10, EOSB: 3, ELSH: 10,
  SPHT: 4, ELWA: 4, NIPH: 2, ELEC: 7, UEGC: 10, SWDY: 7, EMFD: 10, ENGC: 7, EXPA: 3,
  ZEOT: 5, ESRS: 8, FAIT: 3, FAITA: 3, FERC: 8, FIRED: 10, AUTO: 4, AALR: 7, GSSC: 7,
  GETO: 4, GIHD: 10, GGCC: 7, BIOC: 2, GTHE: 11, GMCI: 3, GOCO: 4, GPPL: 4, GTWL: 4,
  GRCA: 3, AGIN: 3, CCRS: 10, HELI: 10, HDBK: 3, INEE: 7, INEG: 7, ICAL: 8, IFAP: 5,
  IBCT: 4, ICID: 3, ICLE: 3, ICMI: 2, DIFC: 8, IPPM: 7, IDRE: 10, ISMA: 5, INFI: 5,
  ITSY: 1, JUFO: 5, KZPC: 8, LKGP: 3, LCSW: 8, MPCO: 5, MOIL: 6, MMAT: 4, MAAL: 10,
  MBEN: 7, MEPA: 2, MNHD: 10, MPCI: 2, MENA: 10, WCDF: 5, MEGM: 8, CEFM: 5, MIPH: 2,
  MBSC: 8, MCQE: 8, MICH: 8, MRCO: 7, MFSC: 4, MEDA: 1, MFINEG: 3, MFPC: 8, MHOT: 4,
  MKIT: 5, ATQA: 8, MOSC: 5, WATP: 7, SMPP: 7, MOIN: 3, NAHO: 3, NCCW: 7, NBKE: 3,
  NCEM: 8, NCMP: 5, NDRL: 6, NHPS: 10, COPR: 10, EGAS: 9, NCIS: 4, NCIN: 10, NCGC: 7,
  NOAF: 10, MILS: 5, NEDA: 5, NINH: 2, OCPH: 2, OCIC: 7, ODHN: 10, ORHD: 10, OTMT: 11,
  ORWE: 4, EBSC: 3, PACH: 8, PHDC: 10, SIMO: 8, PTCC: 7, ASPI: 3, PSAD: 5, ARAB: 10,
  PRMH: 3, PHTV: 4, QNBA: 3, RAKT: 8, RACC: 11, RAYA: 3, REAC: 3, RTVC: 10, RIVA: 2,
  RMTV: 4, ROTO: 4, RUBX: 4, SIPC: 2, SMFR: 8, SMCS: 7, SMCSA: 7, SEIG: 3, SEIGA: 3,
  SNFC: 5, SDTI: 4, SKPC: 8, SCEM: 8, OCDI: 10, SLTD: 4, SAIB: 3, SNFI: 5, SCFM: 5,
  SVCE: 8, SCTS: 1, SBAG: 7, CANA: 3, SUCE: 8, TMGH: 10, TECH: 8, ADPC: 5, TORA: 8,
  TOUR: 10, TRTO: 11, UNBE: 3, UASG: 7, UNIT: 10, UNIP: 8, UNFO: 5, UEFM: 5, UTOP: 10,
  VERT: 1, VODE: 11, WKOL: 7, XPIN: 1, ZMID: 10, DOMT: 5, CLHO: 2, OLFI: 5, MTIE: 4,
  CICH: 3, CIRA: 4, CNFN: 3, SRWA: 3, FWRY: 1, ODIN: 3, RMDA: 2, AIVCB: 4, SPMD: 2,
  OFH: 3, ACAMD: 7, ISPH: 2, TALM: 4, IDHC: 2, ISMQ: 8, TANM: 10, EFIH: 1, GDWA: 7,
  PRDC: 10, KRDI: 5, MCRO: 2, ODID: 3, AIHC: 3, ETEL: 11,
};

/** الرمز → متوافق مع الشريعة (نعم = true، لا = false) من الجدول الرسمي */
const OFFICIAL_SHARIA_RAW: Record<string, boolean> = {
  ABUK: true, ADIB: true, ACRO: true, APPC: true, AJWA: true, SAUD: true, FNAR: true, AMPI: true, ATLC: true,
  ALEXA: false, ALCN: true, AFMC: true, AMOC: true, ANFI: false, AMES: true, AXPH: true, SPIN: true, AMEC: true,
  AMER: true, ALUM: true, CERA: true, ACGC: true, AMIA: true, ADCI: true, APSW: true, RREI: true, ARVA: true,
  AIND: true, ARCC: true, ASCM: true, AITG: true, ALRA: true, BIGP: true, BTFH: false, BCAP: false, BSFR: true,
  CIRF: false, CAED: true, COSG: false, CPCI: true, POUL: true, CSAG: true, PRCL: true, CCAP: false, CCAPP: false,
  COMI: false, CIEB: false, DCRC: true, DTPP: true, DEIN: false, SUGR: true, DAPH: true, DSCW: true, EDFM: true,
  EAST: false, EFID: true, HRHO: false, EGX30ETF: false, EGAL: true, EPCO: true, MISR: true, ESAC: false, EASB: false,
  EGCH: true, OREG: false, EFIC: true, EDBM: true, EGTS: true, EGBE: false, PHAR: true, EITP: false, IRON: true,
  EKHO: false, MPRC: false, MOED: true, AREH: true, AREHA: true, EGSA: false, ESGI: true, ETRS: true, ABRD: true,
  EIUD: true, EHDR: true, AFDI: true, EPPK: false, EEII: true, EALR: true, EBDP: false, ICFC: true, IRAX: true,
  ECAP: true, KWIN: false, ELKA: true, KABO: false, ELNA: true, NASR: false, OBRI: true, EOSB: false, ELSH: true,
  SPHT: false, ELWA: true, NIPH: true, ELEC: true, UEGC: true, SWDY: true, EMFD: true, ENGC: true, EXPA: false,
  ZEOT: true, ESRS: true, FAIT: true, FAITA: true, FERC: false, FIRED: true, AUTO: true, AALR: false, GSSC: false,
  GETO: true, GIHD: true, GGCC: true, BIOC: true, GTHE: false, GMCI: false, GOCO: true, GPPL: false, GTWL: false,
  GRCA: false, AGIN: false, CCRS: true, HELI: true, HDBK: false, INEE: true, INEG: true, ICAL: true, IFAP: true,
  IBCT: true, ICID: false, ICLE: false, ICMI: true, DIFC: true, IPPM: true, IDRE: true, ISMA: true, INFI: true,
  ITSY: true, JUFO: true, KZPC: true, LKGP: false, LCSW: true, MPCO: true, MOIL: true, MMAT: true, MAAL: true,
  MBEN: true, MEPA: true, MNHD: true, MPCI: true, MENA: true, WCDF: true, MEGM: true, CEFM: true, MIPH: true,
  MBSC: true, MCQE: true, MICH: true, MRCO: true, MFSC: false, MEDA: true, MFINEG: false, MFPC: true, MHOT: false,
  MKIT: false, ATQA: true, MOSC: true, WATP: true, SMPP: true, MOIN: false, NAHO: false, NCCW: false, NBKE: false,
  NCEM: false, NCMP: true, NDRL: true, NHPS: false, COPR: false, EGAS: true, NCIS: true, NCIN: false, NCGC: false,
  NOAF: false, MILS: true, NEDA: true, NINH: true, OCPH: true, OCIC: true, ODHN: true, ORHD: true, OTMT: true,
  ORWE: true, EBSC: false, PACH: true, PHDC: true, SIMO: false, PTCC: true, ASPI: true, PSAD: true, ARAB: true,
  PRMH: false, PHTV: false, QNBA: false, RAKT: false, RACC: true, RAYA: true, REAC: true, RTVC: false, RIVA: true,
  RMTV: false, ROTO: false, RUBX: true, SIPC: true, SMFR: true, SMCS: false, SMCSA: false, SEIG: false, SEIGA: false,
  SNFC: true, SDTI: true, SKPC: true, SCEM: true, OCDI: true, SLTD: false, SAIB: false, SNFI: true, SCFM: true,
  SVCE: true, SCTS: true, SBAG: true, CANA: false, SUCE: false, TMGH: true, TECH: false, ADPC: true, TORA: false,
  TOUR: true, TRTO: false, UNBE: false, UASG: false, UNIT: true, UNIP: false, UNFO: true, UEFM: true, UTOP: false,
  VERT: true, VODE: false, WKOL: true, XPIN: false, ZMID: false, DOMT: true, CLHO: true, OLFI: true, MTIE: true,
  CICH: true, CIRA: true, CNFN: false, SRWA: false, FWRY: true, ODIN: false, RMDA: true, AIVCB: true, SPMD: true,
  OFH: true, ACAMD: true, ISPH: true, TALM: true, IDHC: true, ISMQ: true, TANM: false, EFIH: true, GDWA: false,
  PRDC: false, KRDI: true, MCRO: true, ODID: false, AIHC: true, ETEL: true,
};

/** قطاع GICS الرسمي بالرمز — يُرجع undefined إذا لم يكن الرمز في الجدول */
export function getOfficialGics(ticker: string): GicsSector | undefined {
  const num = OFFICIAL_GICS_NUM[ticker];
  return num != null ? GICS_BY_NUM[num] : undefined;
}

/** هل السهم متوافق مع الشريعة حسب الجدول الرسمي — undefined إذا غير مدرج */
export function getOfficialSharia(ticker: string): boolean | undefined {
  return OFFICIAL_SHARIA_RAW[ticker];
}

/** كل الرموز التي لها بيانات رسمية (قطاع أو شريعة) */
export const OFFICIAL_TICKERS = new Set<string>([
  ...Object.keys(OFFICIAL_GICS_NUM),
  ...Object.keys(OFFICIAL_SHARIA_RAW),
]);
