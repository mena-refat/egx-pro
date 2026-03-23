/**
 * EGX index membership sets — ported from client egxIndicesSectors.ts
 * Used server-side for filtering stocks by index without a DB lookup.
 */

const EGX30 = new Set([
  'ABUK', 'ADIB', 'AMOC', 'EFID', 'EGAL', 'ARCC', 'ECAP', 'ESRS', 'FAIT', 'FAITA',
  'AUTO', 'SWDY', 'EMFD', 'TMGH', 'PHDC', 'OCDI', 'ETEL', 'CLHO', 'OLFI', 'MTIE',
  'ISPH', 'RMDA', 'FWRY', 'VLMR', 'VLMRA', 'EAST', 'COMI', 'HRHO', 'EFIH', 'JUFO',
]);

const EGX70 = new Set([
  'ACRO', 'APPC', 'ADCI', 'ALEXA', 'AMIA', 'ANFI', 'ARVA', 'ASCM', 'BCAP', 'BIGP',
  'CAED', 'CERA', 'CIRF', 'COSG', 'CPCI', 'DAPH', 'DEIN', 'EDFM',
  'EKHO', 'ELEC', 'ENGC', 'EPCO', 'ESAC', 'ESGI', 'ETRS', 'FNAR',
  'IDRE', 'IRAX', 'KABO', 'MOED', 'NASR', 'NIPH', 'OBRI', 'PHAR', 'POUL',
  'PRCL', 'RREI', 'SPHT', 'SUGR', 'UEGC', 'ZEOT', 'AMEC', 'AXPH', 'DSCW',
  'EBDP', 'EEII', 'EOSB', 'ICFC', 'ISMQ', 'ODIN', 'SPMD', 'TALM',
  'IDHC', 'MCRO', 'CNFN', 'CICH', 'OFH', 'SRWA', 'TANM', 'GDWA',
  'CIRA', 'HDBK', 'MFPC', 'OCIC', 'SKPC', 'CIEB', 'HELI', 'ALCN',
  'EXPA', 'EGCH', 'PRDC', 'AIND', 'ELSH', 'ACGC', 'EHDR', 'BTFH', 'MNHD',
]);

const EGX100 = new Set([...EGX30, ...EGX70]);

const EGX35LV = new Set([
  'COMI', 'ETEL', 'PHAR', 'CIRA', 'EKHO', 'HDBK', 'MFPC', 'MNHD', 'OCIC', 'EFID',
  'AMOC', 'SKPC', 'SUGR', 'CIEB', 'ADIB', 'ELEC', 'ABUK', 'HELI', 'ALCN', 'TMGH',
  'EXPA', 'EGCH', 'PRDC', 'AIND', 'EFIH', 'EAST', 'ELSH', 'MCRO', 'ENGC', 'FWRY',
  'ACGC', 'CLHO', 'EHDR', 'HRHO', 'BTFH',
]);

const EGX33 = new Set([
  'ABUK', 'ADIB', 'ACRO', 'APPC', 'AJWA', 'SAUD', 'FNAR', 'AMPI', 'ATLC', 'ALCN',
  'AFMC', 'AMOC', 'AMES', 'AXPH', 'SPIN', 'AMEC', 'AMER', 'ALUM', 'CERA', 'ACGC',
  'AMIA', 'ADCI', 'APSW', 'RREI', 'ARVA', 'AIND', 'ARCC', 'ASCM', 'AITG', 'ALRA',
  'BIGP', 'BSFR', 'CAED', 'CPCI', 'POUL', 'CSAG', 'PRCL', 'DCRC', 'DTPP', 'SUGR',
  'DAPH', 'DSCW', 'EDFM', 'EFID', 'EGAL', 'EPCO', 'MISR', 'EGCH', 'EFIC', 'EDBM',
  'EGTS', 'PHAR', 'IRON', 'MOED', 'AREH', 'AREHA', 'ESGI', 'ETRS', 'ABRD', 'EIUD',
  'EHDR', 'AFDI', 'EEII', 'EALR', 'ICFC', 'IRAX', 'ECAP', 'ELKA', 'ELNA', 'OBRI',
  'ELSH', 'ELWA', 'NIPH', 'ELEC', 'UEGC', 'SWDY', 'EMFD', 'ENGC', 'ZEOT', 'ESRS',
  'FAIT', 'FAITA', 'FIRED', 'AUTO', 'GETO', 'GIHD', 'GGCC', 'BIOC', 'GOCO', 'CCRS',
  'HELI', 'INEE', 'INEG', 'ICAL', 'IFAP', 'IBCT', 'ICMI', 'DIFC', 'IPPM', 'IDRE',
  'ISMA', 'INFI', 'ITSY', 'JUFO', 'LCSW', 'MPCO', 'MOIL', 'MMAT', 'MAAL', 'MBEN',
  'MEPA', 'MNHD', 'MPCI', 'MENA', 'WCDF', 'MEGM', 'CEFM', 'MIPH', 'MBSC', 'MCQE',
  'MICH', 'MRCO', 'MFPC', 'ATQA', 'MOSC', 'WATP', 'SMPP', 'NCMP', 'NDRL', 'EGAS',
  'NCIS', 'MILS', 'NEDA', 'NINH', 'OCPH', 'OCIC', 'ODHN', 'ORHD', 'OTMT', 'ORWE',
  'PACH', 'PHDC', 'PTCC', 'ASPI', 'PSAD', 'ARAB', 'RACC', 'RAYA', 'REAC', 'RIVA',
  'RUBX', 'SIPC', 'SMFR', 'SNFC', 'SDTI', 'SKPC', 'SCEM', 'OCDI', 'SNFI', 'SCFM',
  'SVCE', 'SCTS', 'SBAG', 'TMGH', 'ADPC', 'TOUR', 'UNIT', 'UNFO', 'UEFM', 'VERT',
  'WKOL', 'DOMT', 'CLHO', 'OLFI', 'MTIE', 'CICH', 'CIRA', 'FWRY', 'RMDA', 'AIVCB',
  'SPMD', 'OFH', 'ACAMD', 'ISPH', 'TALM', 'IDHC', 'ISMQ', 'KRDI', 'MCRO', 'AIHC',
  'ETEL',
]);

export function isInEGX30(ticker: string): boolean  { return EGX30.has(ticker); }
export function isInEGX70(ticker: string): boolean  { return EGX70.has(ticker); }
export function isInEGX100(ticker: string): boolean { return EGX100.has(ticker); }
export function isInEGX35LV(ticker: string): boolean { return EGX35LV.has(ticker); }
export function isInEGX33(ticker: string): boolean  { return EGX33.has(ticker); }
