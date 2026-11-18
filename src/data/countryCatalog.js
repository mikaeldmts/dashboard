// Complete ISO-3166 numeric -> { iso2, iso3, region, nameEn, namePt } catalog for world-atlas countries-110m
const RAW_COUNTRIES = [
  ["004", "AF", "AFG", "Afghanistan", "Afeganistão", "Ásia Central & Sul"],
  ["008", "AL", "ALB", "Albania", "Albânia", "Europa"],
  ["010", "AQ", "ATA", "Antarctica", "Antártida", "Polar"],
  ["012", "DZ", "DZA", "Algeria", "Argélia", "Norte da África"],
  ["024", "AO", "AGO", "Angola", "Angola", "África Subsaariana"],
  ["031", "AZ", "AZE", "Azerbaijan", "Azerbaijão", "Cáucaso"],
  ["032", "AR", "ARG", "Argentina", "Argentina", "América do Sul"],
  ["036", "AU", "AUS", "Australia", "Austrália", "Oceania"],
  ["040", "AT", "AUT", "Austria", "Áustria", "Europa"],
  ["044", "BS", "BHS", "Bahamas", "Bahamas", "Caribe"],
  ["050", "BD", "BGD", "Bangladesh", "Bangladesh", "Sul da Ásia"],
  ["051", "AM", "ARM", "Armenia", "Armênia", "Cáucaso"],
  ["056", "BE", "BEL", "Belgium", "Bélgica", "Europa"],
  ["064", "BT", "BTN", "Bhutan", "Butão", "Sul da Ásia"],
  ["068", "BO", "BOL", "Bolivia", "Bolívia", "América do Sul"],
  ["070", "BA", "BIH", "Bosnia and Herzegovina", "Bósnia e Herzegovina", "Europa"],
  ["072", "BW", "BWA", "Botswana", "Botsuana", "África Subsaariana"],
  ["076", "BR", "BRA", "Brazil", "Brasil", "América do Sul"],
  ["084", "BZ", "BLZ", "Belize", "Belize", "América Central"],
  ["090", "SB", "SLB", "Solomon Islands", "Ilhas Salomão", "Oceania"],
  ["096", "BN", "BRN", "Brunei", "Brunei", "Sudeste Asiático"],
  ["100", "BG", "BGR", "Bulgaria", "Bulgária", "Europa"],
  ["104", "MM", "MMR", "Myanmar", "Mianmar", "Sudeste Asiático"],
  ["108", "BI", "BDI", "Burundi", "Burundi", "África Subsaariana"],
  ["112", "BY", "BLR", "Belarus", "Belarus", "Europa Oriental"],
  ["116", "KH", "KHM", "Cambodia", "Camboja", "Sudeste Asiático"],
  ["120", "CM", "CMR", "Cameroon", "Camarões", "África Subsaariana"],
  ["124", "CA", "CAN", "Canada", "Canadá", "América do Norte"],
  ["140", "CF", "CAF", "Central African Republic", "República Centro-Africana", "África Subsaariana"],
  ["144", "LK", "LKA", "Sri Lanka", "Sri Lanka", "Sul da Ásia"],
  ["148", "TD", "TCD", "Chad", "Chade", "África Subsaariana"],
  ["152", "CL", "CHL", "Chile", "Chile", "América do Sul"],
  ["156", "CN", "CHN", "China", "China", "Leste Asiático"],
  ["158", "TW", "TWN", "Taiwan", "Taiwan", "Leste Asiático"],
  ["170", "CO", "COL", "Colombia", "Colômbia", "América do Sul"],
  ["178", "CG", "COG", "Republic of the Congo", "República do Congo", "África Subsaariana"],
  ["180", "CD", "COD", "DR Congo", "RD Congo", "África Subsaariana"],
  ["188", "CR", "CRI", "Costa Rica", "Costa Rica", "América Central"],
  ["191", "HR", "HRV", "Croatia", "Croácia", "Europa"],
  ["192", "CU", "CUB", "Cuba", "Cuba", "Caribe"],
  ["196", "CY", "CYP", "Cyprus", "Chipre", "Europa / Mediterrâneo"],
  ["203", "CZ", "CZE", "Czechia", "Tchéquia", "Europa"],
  ["204", "BJ", "BEN", "Benin", "Benim", "África Subsaariana"],
  ["208", "DK", "DNK", "Denmark", "Dinamarca", "Europa"],
  ["214", "DO", "DOM", "Dominican Republic", "República Dominicana", "Caribe"],
  ["218", "EC", "ECU", "Ecuador", "Equador", "América do Sul"],
  ["222", "SV", "SLV", "El Salvador", "El Salvador", "América Central"],
  ["226", "GQ", "GNQ", "Equatorial Guinea", "Guiné Equatorial", "África Subsaariana"],
  ["231", "ET", "ETH", "Ethiopia", "Etiópia", "África Oriental"],
  ["232", "ER", "ERI", "Eritrea", "Eritreia", "África Oriental"],
  ["233", "EE", "EST", "Estonia", "Estônia", "Europa Báltica"],
  ["238", "FK", "FLK", "Falkland Islands", "Ilhas Malvinas", "Atlântico Sul"],
  ["242", "FJ", "FJI", "Fiji", "Fiji", "Oceania"],
  ["246", "FI", "FIN", "Finland", "Finlândia", "Europa Nórdica"],
  ["250", "FR", "FRA", "France", "França", "Europa"],
  ["260", "TF", "ATF", "French Southern Lands", "Terras Austrais Francesas", "Oceano Índico"],
  ["262", "DJ", "DJI", "Djibouti", "Djibuti", "África Oriental"],
  ["266", "GA", "GAB", "Gabon", "Gabão", "África Subsaariana"],
  ["268", "GE", "GEO", "Georgia", "Geórgia", "Cáucaso"],
  ["270", "GM", "GMB", "Gambia", "Gâmbia", "África Ocidental"],
  ["275", "PS", "PSE", "Palestine", "Palestina", "Oriente Médio"],
  ["276", "DE", "DEU", "Germany", "Alemanha", "Europa"],
  ["288", "GH", "GHA", "Ghana", "Gana", "África Ocidental"],
  ["300", "GR", "GRC", "Greece", "Grécia", "Europa"],
  ["304", "GL", "GRL", "Greenland", "Groenlândia", "Ártico"],
  ["320", "GT", "GTM", "Guatemala", "Guatemala", "América Central"],
  ["324", "GN", "GIN", "Guinea", "Guiné", "África Ocidental"],
  ["328", "GY", "GUY", "Guyana", "Guiana", "América do Sul"],
  ["332", "HT", "HTI", "Haiti", "Haiti", "Caribe"],
  ["340", "HN", "HND", "Honduras", "Honduras", "América Central"],
  ["348", "HU", "HUN", "Hungary", "Hungria", "Europa"],
  ["352", "IS", "ISL", "Iceland", "Islândia", "Europa Nórdica"],
  ["356", "IN", "IND", "India", "Índia", "Sul da Ásia"],
  ["360", "ID", "IDN", "Indonesia", "Indonésia", "Sudeste Asiático"],
  ["364", "IR", "IRN", "Iran", "Irã", "Oriente Médio"],
  ["368", "IQ", "IRQ", "Iraq", "Iraque", "Oriente Médio"],
  ["372", "IE", "IRL", "Ireland", "Irlanda", "Europa"],
  ["376", "IL", "ISR", "Israel", "Israel", "Oriente Médio"],
  ["380", "IT", "ITA", "Italy", "Itália", "Europa"],
  ["384", "CI", "CIV", "Ivory Coast", "Costa do Marfim", "África Ocidental"],
  ["388", "JM", "JAM", "Jamaica", "Jamaica", "Caribe"],
  ["392", "JP", "JPN", "Japan", "Japão", "Leste Asiático"],
  ["398", "KZ", "KAZ", "Kazakhstan", "Cazaquistão", "Ásia Central"],
  ["400", "JO", "JOR", "Jordan", "Jordânia", "Oriente Médio"],
  ["404", "KE", "KEN", "Kenya", "Quênia", "África Oriental"],
  ["408", "KP", "PRK", "North Korea", "Coreia do Norte", "Leste Asiático"],
  ["410", "KR", "KOR", "South Korea", "Coreia do Sul", "Leste Asiático"],
  ["414", "KW", "KWT", "Kuwait", "Kuwait", "Oriente Médio"],
  ["417", "KG", "KGZ", "Kyrgyzstan", "Quirguistão", "Ásia Central"],
  ["418", "LA", "LAO", "Laos", "Laos", "Sudeste Asiático"],
  ["422", "LB", "LBN", "Lebanon", "Líbano", "Oriente Médio"],
  ["426", "LS", "LSO", "Lesotho", "Lesoto", "África Austral"],
  ["428", "LV", "LVA", "Latvia", "Letônia", "Europa Báltica"],
  ["430", "LR", "LBR", "Liberia", "Libéria", "África Ocidental"],
  ["434", "LY", "LBY", "Libya", "Líbia", "Norte da África"],
  ["440", "LT", "LTU", "Lithuania", "Lituânia", "Europa Báltica"],
  ["442", "LU", "LUX", "Luxembourg", "Luxemburgo", "Europa"],
  ["450", "MG", "MDG", "Madagascar", "Madagascar", "África Oriental"],
  ["454", "MW", "MWI", "Malawi", "Malaui", "África Austral"],
  ["458", "MY", "MYS", "Malaysia", "Malásia", "Sudeste Asiático"],
  ["466", "ML", "MLI", "Mali", "Mali", "África Ocidental"],
  ["478", "MR", "MRT", "Mauritania", "Mauritânia", "África Ocidental"],
  ["484", "MX", "MEX", "Mexico", "México", "América do Norte"],
  ["496", "MN", "MNG", "Mongolia", "Mongólia", "Leste Asiático"],
  ["498", "MD", "MDA", "Moldova", "Moldávia", "Europa Oriental"],
  ["499", "ME", "MNE", "Montenegro", "Montenegro", "Europa"],
  ["504", "MA", "MAR", "Morocco", "Marrocos", "Norte da África"],
  ["508", "MZ", "MOZ", "Mozambique", "Moçambique", "África Austral"],
  ["512", "OM", "OMN", "Oman", "Omã", "Oriente Médio"],
  ["516", "NA", "NAM", "Namibia", "Namíbia", "África Austral"],
  ["524", "NP", "NPL", "Nepal", "Nepal", "Sul da Ásia"],
  ["528", "NL", "NLD", "Netherlands", "Países Baixos", "Europa"],
  ["540", "NC", "NCL", "New Caledonia", "Nova Caledônia", "Oceania"],
  ["548", "VU", "VUT", "Vanuatu", "Vanuatu", "Oceania"],
  ["554", "NZ", "NZL", "New Zealand", "Nova Zelândia", "Oceania"],
  ["558", "NI", "NIC", "Nicaragua", "Nicarágua", "América Central"],
  ["562", "NE", "NER", "Niger", "Níger", "África Ocidental"],
  ["566", "NG", "NGA", "Nigeria", "Nigéria", "África Ocidental"],
  ["578", "NO", "NOR", "Norway", "Noruega", "Europa Nórdica"],
  ["586", "PK", "PAK", "Pakistan", "Paquistão", "Sul da Ásia"],
  ["591", "PA", "PAN", "Panama", "Panamá", "América Central"],
  ["598", "PG", "PNG", "Papua New Guinea", "Papua-Nova Guiné", "Oceania"],
  ["600", "PY", "PRY", "Paraguay", "Paraguai", "América do Sul"],
  ["604", "PE", "PER", "Peru", "Peru", "América do Sul"],
  ["608", "PH", "PHL", "Philippines", "Filipinas", "Sudeste Asiático"],
  ["616", "PL", "POL", "Poland", "Polônia", "Europa"],
  ["620", "PT", "PRT", "Portugal", "Portugal", "Europa"],
  ["624", "GW", "GNB", "Guinea-Bissau", "Guiné-Bissau", "África Ocidental"],
  ["626", "TL", "TLS", "Timor-Leste", "Timor-Leste", "Sudeste Asiático"],
  ["630", "PR", "PRI", "Puerto Rico", "Porto Rico", "Caribe"],
  ["634", "QA", "QAT", "Qatar", "Catar", "Oriente Médio"],
  ["642", "RO", "ROU", "Romania", "Romênia", "Europa"],
  ["643", "RU", "RUS", "Russia", "Rússia", "Eurásia"],
  ["646", "RW", "RWA", "Rwanda", "Ruanda", "África Oriental"],
  ["682", "SA", "SAU", "Saudi Arabia", "Arábia Saudita", "Oriente Médio"],
  ["686", "SN", "SEN", "Senegal", "Senegal", "África Ocidental"],
  ["688", "RS", "SRB", "Serbia", "Sérvia", "Europa"],
  ["694", "SL", "SLE", "Sierra Leone", "Serra Leoa", "África Ocidental"],
  ["703", "SK", "SVK", "Slovakia", "Eslováquia", "Europa"],
  ["704", "VN", "VNM", "Vietnam", "Vietnã", "Sudeste Asiático"],
  ["705", "SI", "SVN", "Slovenia", "Eslovênia", "Europa"],
  ["706", "SO", "SOM", "Somalia", "Somália", "África Oriental"],
  ["710", "ZA", "ZAF", "South Africa", "África do Sul", "África Austral"],
  ["716", "ZW", "ZWE", "Zimbabwe", "Zimbábue", "África Austral"],
  ["724", "ES", "ESP", "Spain", "Espanha", "Europa"],
  ["728", "SS", "SSD", "South Sudan", "Sudão do Sul", "África Oriental"],
  ["729", "SD", "SDN", "Sudan", "Sudão", "Norte da África"],
  ["732", "EH", "ESH", "Western Sahara", "Saara Ocidental", "Norte da África"],
  ["740", "SR", "SUR", "Suriname", "Suriname", "América do Sul"],
  ["748", "SZ", "SWZ", "Eswatini", "Essuatíni", "África Austral"],
  ["752", "SE", "SWE", "Sweden", "Suécia", "Europa Nórdica"],
  ["756", "CH", "CHE", "Switzerland", "Suíça", "Europa"],
  ["760", "SY", "SYR", "Syria", "Síria", "Oriente Médio"],
  ["762", "TJ", "TJK", "Tajikistan", "Tajiquistão", "Ásia Central"],
  ["764", "TH", "THA", "Thailand", "Tailândia", "Sudeste Asiático"],
  ["768", "TG", "TGO", "Togo", "Togo", "África Ocidental"],
  ["780", "TT", "TTO", "Trinidad and Tobago", "Trinidad e Tobago", "Caribe"],
  ["784", "AE", "ARE", "United Arab Emirates", "Emirados Árabes Unidos", "Oriente Médio"],
  ["788", "TN", "TUN", "Tunisia", "Tunísia", "Norte da África"],
  ["792", "TR", "TUR", "Turkey", "Turquia", "Eurásia / Oriente Médio"],
  ["795", "TM", "TKM", "Turkmenistan", "Turcomenistão", "Ásia Central"],
  ["800", "UG", "UGA", "Uganda", "Uganda", "África Oriental"],
  ["804", "UA", "UKR", "Ukraine", "Ucrânia", "Europa Oriental"],
  ["807", "MK", "MKD", "North Macedonia", "Macedônia do Norte", "Europa"],
  ["818", "EG", "EGY", "Egypt", "Egito", "Norte da África / Oriente Médio"],
  ["826", "GB", "GBR", "United Kingdom", "Reino Unido", "Europa"],
  ["834", "TZ", "TZA", "Tanzania", "Tanzânia", "África Oriental"],
  ["840", "US", "USA", "United States", "Estados Unidos", "América do Norte"],
  ["854", "BF", "BFA", "Burkina Faso", "Burkina Faso", "África Ocidental"],
  ["858", "UY", "URY", "Uruguay", "Uruguai", "América do Sul"],
  ["860", "UZ", "UZB", "Uzbekistan", "Uzbequistão", "Ásia Central"],
  ["862", "VE", "VEN", "Venezuela", "Venezuela", "América do Sul"],
  ["887", "YE", "YEM", "Yemen", "Iêmen", "Oriente Médio"],
  ["894", "ZM", "ZMB", "Zambia", "Zâmbia", "África Austral"]
];

const SPECIAL_BY_NAME = {
  Kosovo: { id: "XKX", iso2: "XK", iso3: "XKX", nameEn: "Kosovo", namePt: "Kosovo", region: "Europa" },
  "N. Cyprus": { id: "CYP-N", iso2: "CY", iso3: "CYP", nameEn: "Northern Cyprus", namePt: "Chipre do Norte", region: "Mediterrâneo" },
  Somaliland: { id: "SOM-L", iso2: "SO", iso3: "SOM", nameEn: "Somaliland", namePt: "Somalilândia", region: "África Oriental" }
};

export function iso2ToFlag(iso2) {
  if (!iso2 || iso2.length !== 2) return "🌐";
  const upper = iso2.toUpperCase();
  const codePoints = [...upper].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const BY_NUMERIC_ID = new Map();
const BY_ISO2 = new Map();
const BY_ISO3 = new Map();

export const ALL_COUNTRIES = RAW_COUNTRIES.map(([id, iso2, iso3, nameEn, namePt, region]) => {
  const entry = {
    id,
    iso2,
    iso3,
    nameEn,
    namePt,
    region,
    flag: iso2ToFlag(iso2)
  };
  BY_NUMERIC_ID.set(id, entry);
  BY_ISO2.set(iso2, entry);
  BY_ISO3.set(iso3, entry);
  return entry;
});

export function resolveCountryFromFeature(feature) {
  if (!feature) return null;
  const rawId = feature.id != null ? String(feature.id).padStart(3, "0") : null;
  if (rawId && BY_NUMERIC_ID.has(rawId)) {
    return BY_NUMERIC_ID.get(rawId);
  }
  const propName = feature.properties?.name;
  if (propName && SPECIAL_BY_NAME[propName]) {
    const special = SPECIAL_BY_NAME[propName];
    return { ...special, flag: iso2ToFlag(special.iso2) };
  }
  if (propName) {
    return {
      id: rawId || propName,
      iso2: "",
      iso3: "",
      nameEn: propName,
      namePt: propName,
      region: "Global",
      flag: "🌐"
    };
  }
  return null;
}

export function getCountryByIso(code) {
  if (!code) return null;
  const upper = String(code).trim().toUpperCase();
  return BY_ISO2.get(upper) || BY_ISO3.get(upper) || null;
}

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchCountries(query, limit = 8) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return ALL_COUNTRIES.filter((c) => {
    if (c.iso2 === "AQ") return false;
    return (
      normalizeSearchText(c.namePt).includes(normalized) ||
      normalizeSearchText(c.nameEn).includes(normalized) ||
      c.iso2.toLowerCase() === normalized ||
      c.iso3.toLowerCase() === normalized
    );
  }).slice(0, limit);
}

// Strategic coordinates [lon, lat] for instant hotspot pinning & server-side headline mapping
export const STRATEGIC_COUNTRY_COORDS = {
  BR: [-47.9, -15.8],
  US: [-98.5, 39.8],
  CN: [104.2, 35.9],
  RU: [37.6, 55.7],
  UA: [31.2, 48.4],
  IL: [35.2, 31.8],
  PS: [35.2, 31.9],
  IR: [53.7, 32.4],
  TW: [121.0, 23.7],
  JP: [138.2, 36.2],
  KR: [127.8, 36.5],
  KP: [127.5, 40.3],
  IN: [78.9, 20.6],
  DE: [10.4, 51.2],
  FR: [2.2, 46.2],
  GB: [-3.4, 55.4],
  IT: [12.6, 41.9],
  ES: [-3.7, 40.5],
  PT: [-8.2, 39.4],
  PL: [19.1, 51.9],
  TR: [35.2, 38.9],
  SA: [45.1, 23.9],
  AE: [53.8, 23.4],
  EG: [30.8, 26.8],
  ZA: [22.9, -30.6],
  NG: [8.7, 9.1],
  SD: [30.2, 12.9],
  CD: [21.8, -4.0],
  AR: [-63.6, -38.4],
  MX: [-102.5, 23.6],
  CA: [-106.3, 56.1],
  VE: [-66.6, 6.4],
  CO: [-74.3, 4.6],
  CL: [-71.5, -35.7],
  AU: [133.8, -25.3],
  ID: [113.9, -0.8],
  PH: [121.8, 12.9],
  PK: [69.3, 30.4],
  SY: [38.9, 34.8],
  LB: [35.9, 33.9],
  YE: [48.5, 15.6]
};
