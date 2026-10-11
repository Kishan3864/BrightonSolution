/**
 * Country estimate from the device time zone, for the /admin reports. No IP address is ever stored,
 * so the country is inferred from the IANA time zone the browser reports (Intl), which devices set
 * from their location. Treat it as an estimate: travellers, VPNs and manually set clocks show up
 * wherever the device clock says, and privacy modes may report UTC (unknown) or Atlantic/Reykjavik.
 *
 * Exports
 * - type Country = { code, name }                 ISO 3166-1 alpha-2 code and short English name.
 * - countryFromTimeZone(timeZone?, language?)    Country | null. The zone wins; when it is missing or
 *                                                 unknown (UTC, Etc/GMT+5), the region subtag of the
 *                                                 language tag is used (en-IN -> IN, zh-Hant-TW -> TW).
 * - countryName(code)                             English name for a code, or null.
 * - regionFromLanguage(language?)                 Region code of a BCP 47 tag, or null (es-419, en).
 *
 * Data: every zone of the IANA tz database zone.tab (one country per zone, tzdb 2026e) plus the backward
 * aliases that browsers still report (Asia/Calcutta, Europe/Kiev, Asia/Saigon, US/Eastern, ...).
 * Generic zones (UTC, Etc/*, CET, EST5EDT, ...) map to no country. Zone ids match case-insensitively.
 */

export type Country = { code: string; name: string };

/** Country code -> space-separated IANA zone ids (zone.tab entries and backward aliases). */
const ZONES: Record<string, string> = {
  AD: "Europe/Andorra",
  AE: "Asia/Dubai",
  AF: "Asia/Kabul",
  AG: "America/Antigua",
  AI: "America/Anguilla",
  AL: "Europe/Tirane",
  AM: "Asia/Yerevan",
  AO: "Africa/Luanda",
  AQ:
    "Antarctica/Casey Antarctica/Davis Antarctica/DumontDUrville Antarctica/Mawson Antarctica/McMurdo " +
    "Antarctica/Palmer Antarctica/Rothera Antarctica/South_Pole Antarctica/Syowa Antarctica/Troll " +
    "Antarctica/Vostok",
  AR:
    "America/Argentina/Buenos_Aires America/Argentina/Catamarca America/Argentina/ComodRivadavia " +
    "America/Argentina/Cordoba America/Argentina/Jujuy America/Argentina/La_Rioja " +
    "America/Argentina/Mendoza America/Argentina/Rio_Gallegos America/Argentina/Salta " +
    "America/Argentina/San_Juan America/Argentina/San_Luis America/Argentina/Tucuman " +
    "America/Argentina/Ushuaia America/Buenos_Aires America/Catamarca America/Cordoba America/Jujuy " +
    "America/Mendoza America/Rosario",
  AS: "Pacific/Pago_Pago Pacific/Samoa US/Samoa",
  AT: "Europe/Vienna",
  AU:
    "Antarctica/Macquarie Australia/ACT Australia/Adelaide Australia/Brisbane Australia/Broken_Hill " +
    "Australia/Canberra Australia/Currie Australia/Darwin Australia/Eucla Australia/Hobart " +
    "Australia/LHI Australia/Lindeman Australia/Lord_Howe Australia/Melbourne Australia/NSW " +
    "Australia/North Australia/Perth Australia/Queensland Australia/South Australia/Sydney " +
    "Australia/Tasmania Australia/Victoria Australia/West Australia/Yancowinna",
  AW: "America/Aruba",
  AX: "Europe/Mariehamn",
  AZ: "Asia/Baku",
  BA: "Europe/Sarajevo",
  BB: "America/Barbados",
  BD: "Asia/Dacca Asia/Dhaka",
  BE: "Europe/Brussels",
  BF: "Africa/Ouagadougou",
  BG: "Europe/Sofia",
  BH: "Asia/Bahrain",
  BI: "Africa/Bujumbura",
  BJ: "Africa/Porto-Novo",
  BL: "America/St_Barthelemy",
  BM: "Atlantic/Bermuda",
  BN: "Asia/Brunei",
  BO: "America/La_Paz",
  BQ: "America/Kralendijk",
  BR:
    "America/Araguaina America/Bahia America/Belem America/Boa_Vista America/Campo_Grande " +
    "America/Cuiaba America/Eirunepe America/Fortaleza America/Maceio America/Manaus America/Noronha " +
    "America/Porto_Acre America/Porto_Velho America/Recife America/Rio_Branco America/Santarem " +
    "America/Sao_Paulo Brazil/Acre Brazil/DeNoronha Brazil/East Brazil/West",
  BS: "America/Nassau",
  BT: "Asia/Thimbu Asia/Thimphu",
  BW: "Africa/Gaborone",
  BY: "Europe/Minsk",
  BZ: "America/Belize",
  CA:
    "America/Atikokan America/Blanc-Sablon America/Cambridge_Bay America/Coral_Harbour " +
    "America/Creston America/Dawson America/Dawson_Creek America/Edmonton America/Fort_Nelson " +
    "America/Glace_Bay America/Goose_Bay America/Halifax America/Inuvik America/Iqaluit " +
    "America/Moncton America/Montreal America/Nipigon America/Pangnirtung America/Rainy_River " +
    "America/Rankin_Inlet America/Regina America/Resolute America/St_Johns America/Swift_Current " +
    "America/Thunder_Bay America/Toronto America/Vancouver America/Whitehorse America/Winnipeg " +
    "America/Yellowknife Canada/Atlantic Canada/Central Canada/Eastern Canada/Mountain " +
    "Canada/Newfoundland Canada/Pacific Canada/Saskatchewan Canada/Yukon",
  CC: "Indian/Cocos",
  CD: "Africa/Kinshasa Africa/Lubumbashi",
  CF: "Africa/Bangui",
  CG: "Africa/Brazzaville",
  CH: "Europe/Zurich",
  CI: "Africa/Abidjan",
  CK: "Pacific/Rarotonga",
  CL:
    "America/Coyhaique America/Punta_Arenas America/Santiago Chile/Continental Chile/EasterIsland " +
    "Pacific/Easter",
  CM: "Africa/Douala",
  CN: "Asia/Chongqing Asia/Chungking Asia/Harbin Asia/Kashgar Asia/Shanghai Asia/Urumqi PRC",
  CO: "America/Bogota",
  CR: "America/Costa_Rica",
  CU: "America/Havana Cuba",
  CV: "Atlantic/Cape_Verde",
  CW: "America/Curacao",
  CX: "Indian/Christmas",
  CY: "Asia/Famagusta Asia/Nicosia Europe/Nicosia",
  CZ: "Europe/Prague",
  DE: "Europe/Berlin Europe/Busingen",
  DJ: "Africa/Djibouti",
  DK: "Europe/Copenhagen",
  DM: "America/Dominica",
  DO: "America/Santo_Domingo",
  DZ: "Africa/Algiers",
  EC: "America/Guayaquil Pacific/Galapagos",
  EE: "Europe/Tallinn",
  EG: "Africa/Cairo Egypt",
  EH: "Africa/El_Aaiun",
  ER: "Africa/Asmara Africa/Asmera",
  ES: "Africa/Ceuta Atlantic/Canary Europe/Madrid",
  ET: "Africa/Addis_Ababa",
  FI: "Europe/Helsinki",
  FJ: "Pacific/Fiji",
  FK: "Atlantic/Stanley",
  FM: "Pacific/Chuuk Pacific/Kosrae Pacific/Pohnpei Pacific/Ponape Pacific/Truk Pacific/Yap",
  FO: "Atlantic/Faeroe Atlantic/Faroe",
  FR: "Europe/Paris",
  GA: "Africa/Libreville",
  GB: "Europe/Belfast Europe/London GB GB-Eire",
  GD: "America/Grenada",
  GE: "Asia/Tbilisi",
  GF: "America/Cayenne",
  GG: "Europe/Guernsey",
  GH: "Africa/Accra",
  GI: "Europe/Gibraltar",
  GL: "America/Danmarkshavn America/Godthab America/Nuuk America/Scoresbysund America/Thule",
  GM: "Africa/Banjul",
  GN: "Africa/Conakry",
  GP: "America/Guadeloupe",
  GQ: "Africa/Malabo",
  GR: "Europe/Athens",
  GS: "Atlantic/South_Georgia",
  GT: "America/Guatemala",
  GU: "Pacific/Guam",
  GW: "Africa/Bissau",
  GY: "America/Guyana",
  HK: "Asia/Hong_Kong Hongkong",
  HN: "America/Tegucigalpa",
  HR: "Europe/Zagreb",
  HT: "America/Port-au-Prince",
  HU: "Europe/Budapest",
  ID: "Asia/Jakarta Asia/Jayapura Asia/Makassar Asia/Pontianak Asia/Ujung_Pandang",
  IE: "Eire Europe/Dublin",
  IL: "Asia/Jerusalem Asia/Tel_Aviv Israel",
  IM: "Europe/Isle_of_Man",
  IN: "Asia/Calcutta Asia/Kolkata",
  IO: "Indian/Chagos",
  IQ: "Asia/Baghdad",
  IR: "Asia/Tehran Iran",
  IS: "Atlantic/Reykjavik Iceland",
  IT: "Europe/Rome",
  JE: "Europe/Jersey",
  JM: "America/Jamaica Jamaica",
  JO: "Asia/Amman",
  JP: "Asia/Tokyo Japan",
  KE: "Africa/Nairobi",
  KG: "Asia/Bishkek",
  KH: "Asia/Phnom_Penh",
  KI: "Pacific/Enderbury Pacific/Kanton Pacific/Kiritimati Pacific/Tarawa",
  KM: "Indian/Comoro",
  KN: "America/St_Kitts",
  KP: "Asia/Pyongyang",
  KR: "Asia/Seoul ROK",
  KW: "Asia/Kuwait",
  KY: "America/Cayman",
  KZ: "Asia/Almaty Asia/Aqtau Asia/Aqtobe Asia/Atyrau Asia/Oral Asia/Qostanay Asia/Qyzylorda",
  LA: "Asia/Vientiane",
  LB: "Asia/Beirut",
  LC: "America/St_Lucia",
  LI: "Europe/Vaduz",
  LK: "Asia/Colombo",
  LR: "Africa/Monrovia",
  LS: "Africa/Maseru",
  LT: "Europe/Vilnius",
  LU: "Europe/Luxembourg",
  LV: "Europe/Riga",
  LY: "Africa/Tripoli Libya",
  MA: "Africa/Casablanca",
  MC: "Europe/Monaco",
  MD: "Europe/Chisinau Europe/Tiraspol",
  ME: "Europe/Podgorica",
  MF: "America/Marigot",
  MG: "Indian/Antananarivo",
  MH: "Kwajalein Pacific/Kwajalein Pacific/Majuro",
  MK: "Europe/Skopje",
  ML: "Africa/Bamako Africa/Timbuktu",
  MM: "Asia/Rangoon Asia/Yangon",
  MN: "Asia/Choibalsan Asia/Hovd Asia/Ulaanbaatar Asia/Ulan_Bator",
  MO: "Asia/Macao Asia/Macau",
  MP: "Pacific/Saipan",
  MQ: "America/Martinique",
  MR: "Africa/Nouakchott",
  MS: "America/Montserrat",
  MT: "Europe/Malta",
  MU: "Indian/Mauritius",
  MV: "Indian/Maldives",
  MW: "Africa/Blantyre",
  MX:
    "America/Bahia_Banderas America/Cancun America/Chihuahua America/Ciudad_Juarez America/Ensenada " +
    "America/Hermosillo America/Matamoros America/Mazatlan America/Merida America/Mexico_City " +
    "America/Monterrey America/Ojinaga America/Santa_Isabel America/Tijuana Mexico/BajaNorte " +
    "Mexico/BajaSur Mexico/General",
  MY: "Asia/Kuala_Lumpur Asia/Kuching",
  MZ: "Africa/Maputo",
  NA: "Africa/Windhoek",
  NC: "Pacific/Noumea",
  NE: "Africa/Niamey",
  NF: "Pacific/Norfolk",
  NG: "Africa/Lagos",
  NI: "America/Managua",
  NL: "Europe/Amsterdam",
  NO: "Europe/Oslo",
  NP: "Asia/Kathmandu Asia/Katmandu",
  NR: "Pacific/Nauru",
  NU: "Pacific/Niue",
  NZ: "NZ NZ-CHAT Pacific/Auckland Pacific/Chatham",
  OM: "Asia/Muscat",
  PA: "America/Panama",
  PE: "America/Lima",
  PF: "Pacific/Gambier Pacific/Marquesas Pacific/Tahiti",
  PG: "Pacific/Bougainville Pacific/Port_Moresby",
  PH: "Asia/Manila",
  PK: "Asia/Karachi",
  PL: "Europe/Warsaw Poland",
  PM: "America/Miquelon",
  PN: "Pacific/Pitcairn",
  PR: "America/Puerto_Rico",
  PS: "Asia/Gaza Asia/Hebron",
  PT: "Atlantic/Azores Atlantic/Madeira Europe/Lisbon Portugal",
  PW: "Pacific/Palau",
  PY: "America/Asuncion",
  QA: "Asia/Qatar",
  RE: "Indian/Reunion",
  RO: "Europe/Bucharest",
  RS: "Europe/Belgrade",
  RU:
    "Asia/Anadyr Asia/Barnaul Asia/Chita Asia/Irkutsk Asia/Kamchatka Asia/Khandyga Asia/Krasnoyarsk " +
    "Asia/Magadan Asia/Novokuznetsk Asia/Novosibirsk Asia/Omsk Asia/Sakhalin Asia/Srednekolymsk " +
    "Asia/Tomsk Asia/Ust-Nera Asia/Vladivostok Asia/Yakutsk Asia/Yekaterinburg Europe/Astrakhan " +
    "Europe/Kaliningrad Europe/Kirov Europe/Moscow Europe/Samara Europe/Saratov Europe/Ulyanovsk " +
    "Europe/Volgograd W-SU",
  RW: "Africa/Kigali",
  SA: "Asia/Riyadh",
  SB: "Pacific/Guadalcanal",
  SC: "Indian/Mahe",
  SD: "Africa/Khartoum",
  SE: "Europe/Stockholm",
  SG: "Asia/Singapore Singapore",
  SH: "Atlantic/St_Helena",
  SI: "Europe/Ljubljana",
  SJ: "Arctic/Longyearbyen Atlantic/Jan_Mayen",
  SK: "Europe/Bratislava",
  SL: "Africa/Freetown",
  SM: "Europe/San_Marino",
  SN: "Africa/Dakar",
  SO: "Africa/Mogadishu",
  SR: "America/Paramaribo",
  SS: "Africa/Juba",
  ST: "Africa/Sao_Tome",
  SV: "America/El_Salvador",
  SX: "America/Lower_Princes",
  SY: "Asia/Damascus",
  SZ: "Africa/Mbabane",
  TC: "America/Grand_Turk",
  TD: "Africa/Ndjamena",
  TF: "Indian/Kerguelen",
  TG: "Africa/Lome",
  TH: "Asia/Bangkok",
  TJ: "Asia/Dushanbe",
  TK: "Pacific/Fakaofo",
  TL: "Asia/Dili",
  TM: "Asia/Ashgabat Asia/Ashkhabad",
  TN: "Africa/Tunis",
  TO: "Pacific/Tongatapu",
  TR: "Asia/Istanbul Europe/Istanbul Turkey",
  TT: "America/Port_of_Spain",
  TV: "Pacific/Funafuti",
  TW: "Asia/Taipei ROC",
  TZ: "Africa/Dar_es_Salaam",
  UA: "Europe/Kiev Europe/Kyiv Europe/Simferopol Europe/Uzhgorod Europe/Zaporozhye",
  UG: "Africa/Kampala",
  UM: "Pacific/Johnston Pacific/Midway Pacific/Wake",
  US:
    "America/Adak America/Anchorage America/Atka America/Boise America/Chicago America/Denver " +
    "America/Detroit America/Fort_Wayne America/Indiana/Indianapolis America/Indiana/Knox " +
    "America/Indiana/Marengo America/Indiana/Petersburg America/Indiana/Tell_City " +
    "America/Indiana/Vevay America/Indiana/Vincennes America/Indiana/Winamac America/Indianapolis " +
    "America/Juneau America/Kentucky/Louisville America/Kentucky/Monticello America/Knox_IN " +
    "America/Los_Angeles America/Louisville America/Menominee America/Metlakatla America/New_York " +
    "America/Nome America/North_Dakota/Beulah America/North_Dakota/Center " +
    "America/North_Dakota/New_Salem America/Phoenix America/Shiprock America/Sitka America/Yakutat " +
    "Navajo Pacific/Honolulu US/Alaska US/Aleutian US/Arizona US/Central US/East-Indiana US/Eastern " +
    "US/Hawaii US/Indiana-Starke US/Michigan US/Mountain US/Pacific",
  UY: "America/Montevideo",
  UZ: "Asia/Samarkand Asia/Tashkent",
  VA: "Europe/Vatican",
  VC: "America/St_Vincent",
  VE: "America/Caracas",
  VG: "America/Tortola",
  VI: "America/St_Thomas America/Virgin",
  VN: "Asia/Ho_Chi_Minh Asia/Saigon",
  VU: "Pacific/Efate",
  WF: "Pacific/Wallis",
  WS: "Pacific/Apia",
  YE: "Asia/Aden",
  YT: "Indian/Mayotte",
  ZA: "Africa/Johannesburg",
  ZM: "Africa/Lusaka",
  ZW: "Africa/Harare",
};

/** ISO 3166-1 alpha-2 -> short English name (plus XK, Kosovo, which language tags use). */
const NAMES: Record<string, string> = {
  AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan", AG: "Antigua and Barbuda", AI: "Anguilla",
  AL: "Albania", AM: "Armenia", AO: "Angola", AQ: "Antarctica", AR: "Argentina", AS: "American Samoa",
  AT: "Austria", AU: "Australia", AW: "Aruba", AX: "Aland Islands", AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina", BB: "Barbados", BD: "Bangladesh", BE: "Belgium", BF: "Burkina Faso",
  BG: "Bulgaria", BH: "Bahrain", BI: "Burundi", BJ: "Benin", BL: "St Barthelemy", BM: "Bermuda",
  BN: "Brunei", BO: "Bolivia", BQ: "Caribbean Netherlands", BR: "Brazil", BS: "Bahamas", BT: "Bhutan",
  BV: "Bouvet Island", BW: "Botswana", BY: "Belarus", BZ: "Belize", CA: "Canada",
  CC: "Cocos (Keeling) Islands", CD: "DR Congo", CF: "Central African Republic", CG: "Congo",
  CH: "Switzerland", CI: "Cote d'Ivoire", CK: "Cook Islands", CL: "Chile", CM: "Cameroon", CN: "China",
  CO: "Colombia", CR: "Costa Rica", CU: "Cuba", CV: "Cape Verde", CW: "Curacao", CX: "Christmas Island",
  CY: "Cyprus", CZ: "Czechia", DE: "Germany", DJ: "Djibouti", DK: "Denmark", DM: "Dominica",
  DO: "Dominican Republic", DZ: "Algeria", EC: "Ecuador", EE: "Estonia", EG: "Egypt", EH: "Western Sahara",
  ER: "Eritrea", ES: "Spain", ET: "Ethiopia", FI: "Finland", FJ: "Fiji", FK: "Falkland Islands",
  FM: "Micronesia", FO: "Faroe Islands", FR: "France", GA: "Gabon", GB: "United Kingdom", GD: "Grenada",
  GE: "Georgia", GF: "French Guiana", GG: "Guernsey", GH: "Ghana", GI: "Gibraltar", GL: "Greenland",
  GM: "Gambia", GN: "Guinea", GP: "Guadeloupe", GQ: "Equatorial Guinea", GR: "Greece", GS: "South Georgia",
  GT: "Guatemala", GU: "Guam", GW: "Guinea-Bissau", GY: "Guyana", HK: "Hong Kong",
  HM: "Heard and McDonald Islands", HN: "Honduras", HR: "Croatia", HT: "Haiti", HU: "Hungary",
  ID: "Indonesia", IE: "Ireland", IL: "Israel", IM: "Isle of Man", IN: "India",
  IO: "British Indian Ocean Territory", IQ: "Iraq", IR: "Iran", IS: "Iceland", IT: "Italy", JE: "Jersey",
  JM: "Jamaica", JO: "Jordan", JP: "Japan", KE: "Kenya", KG: "Kyrgyzstan", KH: "Cambodia", KI: "Kiribati",
  KM: "Comoros", KN: "St Kitts and Nevis", KP: "North Korea", KR: "South Korea", KW: "Kuwait",
  KY: "Cayman Islands", KZ: "Kazakhstan", LA: "Laos", LB: "Lebanon", LC: "St Lucia", LI: "Liechtenstein",
  LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia",
  LY: "Libya", MA: "Morocco", MC: "Monaco", MD: "Moldova", ME: "Montenegro", MF: "St Martin",
  MG: "Madagascar", MH: "Marshall Islands", MK: "North Macedonia", ML: "Mali", MM: "Myanmar", MN: "Mongolia",
  MO: "Macao", MP: "Northern Mariana Islands", MQ: "Martinique", MR: "Mauritania", MS: "Montserrat",
  MT: "Malta", MU: "Mauritius", MV: "Maldives", MW: "Malawi", MX: "Mexico", MY: "Malaysia", MZ: "Mozambique",
  NA: "Namibia", NC: "New Caledonia", NE: "Niger", NF: "Norfolk Island", NG: "Nigeria", NI: "Nicaragua",
  NL: "Netherlands", NO: "Norway", NP: "Nepal", NR: "Nauru", NU: "Niue", NZ: "New Zealand", OM: "Oman",
  PA: "Panama", PE: "Peru", PF: "French Polynesia", PG: "Papua New Guinea", PH: "Philippines",
  PK: "Pakistan", PL: "Poland", PM: "St Pierre and Miquelon", PN: "Pitcairn Islands", PR: "Puerto Rico",
  PS: "Palestine", PT: "Portugal", PW: "Palau", PY: "Paraguay", QA: "Qatar", RE: "Reunion", RO: "Romania",
  RS: "Serbia", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SB: "Solomon Islands", SC: "Seychelles",
  SD: "Sudan", SE: "Sweden", SG: "Singapore", SH: "St Helena", SI: "Slovenia", SJ: "Svalbard and Jan Mayen",
  SK: "Slovakia", SL: "Sierra Leone", SM: "San Marino", SN: "Senegal", SO: "Somalia", SR: "Suriname",
  SS: "South Sudan", ST: "Sao Tome and Principe", SV: "El Salvador", SX: "Sint Maarten", SY: "Syria",
  SZ: "Eswatini", TC: "Turks and Caicos Islands", TD: "Chad", TF: "French Southern Territories", TG: "Togo",
  TH: "Thailand", TJ: "Tajikistan", TK: "Tokelau", TL: "Timor-Leste", TM: "Turkmenistan", TN: "Tunisia",
  TO: "Tonga", TR: "Turkey", TT: "Trinidad and Tobago", TV: "Tuvalu", TW: "Taiwan", TZ: "Tanzania",
  UA: "Ukraine", UG: "Uganda", UM: "US Outlying Islands", US: "United States", UY: "Uruguay",
  UZ: "Uzbekistan", VA: "Vatican City", VC: "St Vincent and the Grenadines", VE: "Venezuela",
  VG: "British Virgin Islands", VI: "US Virgin Islands", VN: "Vietnam", VU: "Vanuatu",
  WF: "Wallis and Futuna", WS: "Samoa", XK: "Kosovo", YE: "Yemen", YT: "Mayotte", ZA: "South Africa",
  ZM: "Zambia", ZW: "Zimbabwe",
};

let zoneIndex: Map<string, string> | null = null;

function index(): Map<string, string> {
  if (zoneIndex) return zoneIndex;
  const map = new Map<string, string>();
  for (const [code, zones] of Object.entries(ZONES)) {
    for (const zone of zones.split(" ")) if (zone) map.set(zone.toLowerCase(), code);
  }
  zoneIndex = map;
  return map;
}

export function countryName(code: string): string | null {
  return NAMES[code.toUpperCase()] ?? null;
}

/** Region subtag of a BCP 47 language tag ("en-IN" -> "IN"); null without one or for areas like 419. */
export function regionFromLanguage(language?: string): string | null {
  if (typeof language !== "string") return null;
  const parts = language.trim().split(/[-_]/);
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i];
    if (/^[A-Za-z]{2}$/.test(part)) {
      const code = part.toUpperCase();
      return NAMES[code] ? code : null;
    }
    if (/^[A-Za-z]{4}$/.test(part)) continue; // script subtag (Hant, Latn)
    return null; // numeric area (419), variant or extension: no country
  }
  return null;
}

/** Estimated country of a device from its IANA time zone, else from its language tag; null when unknown. */
export function countryFromTimeZone(timeZone?: string, language?: string): Country | null {
  const zone = typeof timeZone === "string" ? timeZone.trim().toLowerCase() : "";
  const fromZone = zone ? index().get(zone) : undefined;
  const code = fromZone ?? regionFromLanguage(language);
  if (!code) return null;
  const name = NAMES[code];
  return name ? { code, name } : null;
}
