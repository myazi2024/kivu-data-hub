/**
 * Référence géographique pour les données de test (copie de src/lib/geographicData.ts).
 * Un test Vitest vérifie que cette copie reste identique à la source de l'application.
 * Fichier généré : ne pas modifier à la main.
 */
export const LAND_DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  "Kinshasa": [
    "Gombe",
    "Ngaliema",
    "Limete",
    "Matete",
    "Kasa-Vubu",
    "N'Sele",
    "Bandalungwa",
    "N'Djili",
    "Mont-Ngafula",
    "Barumbu",
    "Maluku",
    "Kintambo",
    "Selembao",
    "Lingwala",
    "Kimbanseke",
    "Kinshasa"
  ],
  "Kongo-Central": [
    "Matadi",
    "Boma",
    "Mbanza-Ngungu",
    "Songololo",
    "Tshela",
    "Luozi",
    "Seke-Banza",
    "Kisantu",
    "Moanda",
    "Kasangulu",
    "Lukula"
  ],
  "Haut-Katanga": [
    "Lubumbashi-Ouest",
    "Lubumbashi-Est",
    "Lubumbashi-Plateau",
    "Kipushi-Nord",
    "Kipushi-Sud",
    "Kasumbalesa-Sakania",
    "Likasi",
    "Kasenga/M'Pweto"
  ],
  "Lualaba": [
    "Kolwezi I",
    "Kolwezi II",
    "Dilolo",
    "Mutshatsha",
    "Lubudi"
  ],
  "Tanganyika": [
    "Kalemie",
    "Lukuga",
    "Moba",
    "Kongolo",
    "Manono"
  ],
  "Haut-Lomami": [
    "Kamina",
    "Kanyama"
  ],
  "Haut-Uele": [
    "Isiro",
    "Watsa",
    "Dungu",
    "Wamba"
  ],
  "Bas-Uele": [
    "Buta",
    "Bondo",
    "Bambesa"
  ],
  "Équateur": [
    "Mbandaka I",
    "Mbandaka II",
    "Mbansakusu",
    "Bikoro",
    "Bomongo",
    "Ingende",
    "Makanza"
  ],
  "Mongala": [
    "Lisala",
    "Bumba"
  ],
  "Tshuapa": [
    "Boende",
    "Bokungu"
  ],
  "Sud-Ubangi": [
    "Gemena",
    "Zongo"
  ],
  "Nord-Ubangi": [
    "Gbadolite",
    "Yakoma"
  ],
  "Nord-Kivu": [
    "Goma",
    "Karisimbi",
    "Rutshuru",
    "Lubero",
    "Kayna",
    "Walikale",
    "Beni-Ville",
    "Beni-Territoire",
    "Butembo I",
    "Butembo II",
    "Nyiragongo",
    "Kyondo",
    "Masisi"
  ],
  "Sud-Kivu": [
    "Bukavu I",
    "Bukavu II",
    "Kabare",
    "Kalehe-Centre",
    "Kalehe-Nord",
    "Kalehe-Sud/Kalonge",
    "Mwenga-Kamituga",
    "Shabunda-Nord",
    "Shabunda-Sud",
    "Baraka-Fizi",
    "Walungu",
    "Idjwi",
    "Uvira-Ville",
    "Uvira-Territoire"
  ],
  "Lomami": [
    "Mwene-Ditu",
    "Kabinda"
  ],
  "Ituri": [
    "Bunia",
    "Aru",
    "Mahagi",
    "Djugu",
    "Mambasa",
    "Irumu"
  ],
  "Tshopo": [
    "Tshopo I",
    "Tshopo II",
    "Kisangani-Nord",
    "Kisangani-Sud"
  ],
  "Maniema": [
    "Kindu I",
    "Kindu II",
    "Pangi",
    "Lubutu",
    "Punia",
    "Kasongo",
    "Kabambare",
    "Kibombo"
  ],
  "Kasaï": [
    "Tshikapa",
    "Mweka",
    "Ilebo"
  ],
  "Kasaï-Central": [
    "Kananga",
    "Dibaya",
    "Luiza"
  ],
  "Kasaï-Oriental": [
    "Mbuji-Mayi",
    "Katanda",
    "Kabeya-Kamwanga",
    "Tshilenge"
  ],
  "Sankuru": [
    "Lodja",
    "Lusambo",
    "Katako-Kombe"
  ],
  "Maï-Ndombe": [
    "Inongo",
    "Kutu",
    "Bolobo",
    "Mushie"
  ],
  "Kwango": [
    "Kenge",
    "Kasongo-Lunda",
    "Kahemba"
  ],
  "Kwilu": [
    "Kikwit I",
    "Kikwit II",
    "Bandundu-Ville",
    "Idiofa",
    "Gungu",
    "Masimanimba",
    "Bulungu"
  ]
};

/** Territoires (et leurs premières collectivités) par province, pour les parcelles SR. */
export const RURAL_TERRITORIES_BY_PROVINCE: Record<string, Record<string, string[]>> = {
  "Nord-Kivu": {
    "Masisi": [
      "Bashali-Kaembe",
      "Bashali-Mokoto",
      "Katoyi",
      "Kisimba-Ikobo"
    ],
    "Rutshuru": [
      "Bwisha",
      "Bwito",
      "Jomba",
      "Kiwanja"
    ],
    "Nyiragongo": [
      "Kibumba",
      "Rugari",
      "Busanza",
      "Kibati"
    ],
    "Walikale": [
      "Bakano",
      "Ikobo",
      "Wanianga",
      "Bakano-Pinga"
    ],
    "Lubero": [
      "Bapakombe",
      "Bapere",
      "Baswaga",
      "Batangi"
    ],
    "Beni": [
      "Bashu",
      "Bapakombe",
      "Babila-Bakeulu",
      "Beni-Centre"
    ],
    "Oicha": [
      "Watalinga",
      "Bashu",
      "Beni-Mbau"
    ]
  },
  "Sud-Kivu": {
    "Fizi": [
      "Tangani'a",
      "Mutambala",
      "Ngandja",
      "Ebuela"
    ],
    "Uvira": [
      "Bafuliiru",
      "Bavira",
      "Banyindu",
      "Ruzizi"
    ],
    "Mwenga": [
      "Burhinyi",
      "Itombwe",
      "Lwindi"
    ],
    "Shabunda": [
      "Bakisi",
      "Balowa",
      "Wamuzila"
    ],
    "Walungu": [
      "Ngweshe",
      "Kaziba",
      "Kaniola"
    ],
    "Kabare": [
      "Kabare",
      "Nindja",
      "Kalehe-Centre"
    ],
    "Kalehe": [
      "Bunyakiri",
      "Bugobe",
      "Kalehe-Nyamasasa"
    ],
    "Idjwi": [
      "Rubenga",
      "Ntambuka"
    ]
  },
  "Kinshasa": {},
  "Kongo-Central": {
    "Kasangulu": [
      "Kasangulu",
      "Ngeba"
    ],
    "Madimba": [
      "Madimba",
      "Kimpese"
    ],
    "Lukula": [
      "Lukula",
      "Tshela"
    ],
    "Tshela": [
      "Tshela",
      "Loango"
    ],
    "Songololo": [
      "Songololo",
      "Kimvula"
    ],
    "Luozi": [
      "Luozi",
      "Yema"
    ],
    "Seke-Banza": [
      "Seke-Banza",
      "Kimpangu"
    ],
    "Mbanza-Ngungu": [
      "Mbanza-Ngungu",
      "Kwilu-Ngongo"
    ],
    "Moanda": [
      "Moanda",
      "Nzadi"
    ]
  },
  "Kwilu": {
    "Bulungu": [
      "Bulungu",
      "Kipuka"
    ],
    "Gungu": [
      "Gungu",
      "Kiyaka"
    ],
    "Idiofa": [
      "Idiofa",
      "Yasa-Bonga"
    ],
    "Masi-Manimba": [
      "Masi-Manimba",
      "Kinzau-Vuete"
    ],
    "Bagata": [
      "Bagata",
      "Kwilu-Ngongo"
    ],
    "Mangai": [
      "Mangai",
      "Bokoro"
    ],
    "Kasongo-Lunda": [
      "Kasongo-Lunda"
    ]
  },
  "Haut-Katanga": {
    "Kambove": [
      "Kambove",
      "Kasenga"
    ],
    "Mitwaba": [
      "Mitwaba",
      "Pweto"
    ],
    "Pweto": [
      "Pweto",
      "Kilwa"
    ],
    "Sakania": [
      "Sakania"
    ],
    "Kasenga": [
      "Kasenga"
    ]
  },
  "Lualaba": {
    "Mutshatsha": [
      "Mutshatsha",
      "Kafakumba"
    ],
    "Kapanga": [
      "Kapanga",
      "Sandoa"
    ],
    "Dilolo": [
      "Dilolo"
    ],
    "Sandoa": [
      "Sandoa"
    ]
  },
  "Ituri": {
    "Djugu": [
      "Bahema Nord",
      "Bahema Sud",
      "Walendu-Bindi"
    ],
    "Irumu": [
      "Bahema-Banywagi",
      "Wamba"
    ],
    "Mambasa": [
      "Babila-Babombi",
      "Walese-Vonkutu"
    ],
    "Mahagi": [
      "Panduru",
      "Wanyali-Tchakpi"
    ],
    "Aru": [
      "Aru",
      "Logoro"
    ]
  },
  "Tshopo": {
    "Banalia": [
      "Babombi",
      "Babila"
    ],
    "Basoko": [
      "Basoko",
      "Yatolema"
    ],
    "Bafwasende": [
      "Bafwasende",
      "Babombi"
    ],
    "Ubundu": [
      "Ubundu",
      "Wanie-Rukula"
    ],
    "Isangi": [
      "Isangi",
      "Yaselia"
    ],
    "Yahuma": [
      "Yahuma"
    ],
    "Opala": [
      "Opala"
    ]
  },
  "Kasaï": {
    "Dekese": [
      "Dekese",
      "Bena-Leka"
    ],
    "Dimbelenge": [
      "Dimbelenge"
    ],
    "Ilebo": [
      "Ilebo",
      "Bena-Dibele"
    ],
    "Kamonia": [
      "Kamonia",
      "Luiza"
    ],
    "Luebo": [
      "Luebo",
      "Territoire"
    ],
    "Mweka": [
      "Mweka"
    ],
    "Luiza": [
      "Luiza"
    ]
  },
  "Kasaï-Central": {
    "Demba": [
      "Demba",
      "Dibaya"
    ],
    "Dibaya": [
      "Dibaya",
      "Diulu"
    ],
    "Dimbelenge": [
      "Dimbelenge",
      "Miabi"
    ],
    "Kazumba": [
      "Kazumba",
      "Luiza"
    ],
    "Luiza": [
      "Luiza",
      "Kamuesha"
    ]
  },
  "Kasaï-Oriental": {
    "Kabeya-Kamwanga": [
      "Kabeya-Kamwanga"
    ],
    "Katanda": [
      "Katanda",
      "Tshilenge"
    ],
    "Lupatapata": [
      "Lupatapata"
    ],
    "Miabi": [
      "Miabi",
      "Tshitenge"
    ],
    "Tshilenge": [
      "Tshilenge",
      "Luputa"
    ]
  },
  "Maniema": {
    "Kabambare": [
      "Kabambare",
      "Samba"
    ],
    "Kailo": [
      "Kailo",
      "Kunda"
    ],
    "Kasongo": [
      "Kasongo",
      "Samba"
    ],
    "Kibombo": [
      "Kibombo",
      "Katako-Kombe"
    ],
    "Lubutu": [
      "Lubutu",
      "Oso"
    ],
    "Pangi": [
      "Pangi",
      "Kasese"
    ],
    "Punia": [
      "Punia",
      "Wamaza"
    ]
  },
  "Haut-Uele": {
    "Dungu": [
      "Dungu",
      "Bangadi"
    ],
    "Faradje": [
      "Faradje"
    ],
    "Niangara": [
      "Niangara",
      "Bangadi"
    ],
    "Rungu": [
      "Rungu",
      "Doruma"
    ],
    "Wamba": [
      "Wamba",
      "Poko"
    ],
    "Watsa": [
      "Watsa",
      "Ango"
    ]
  },
  "Bas-Uele": {
    "Aketi": [
      "Aketi",
      "Likati"
    ],
    "Ango": [
      "Ango",
      "Bambesa"
    ],
    "Bambesa": [
      "Bambesa",
      "Titule"
    ],
    "Bondo": [
      "Bondo",
      "Bozene"
    ],
    "Poko": [
      "Poko",
      "Gwane"
    ]
  },
  "Kwango": {
    "Feshi": [
      "Feshi",
      "Lusanga"
    ],
    "Kahemba": [
      "Kahemba",
      "Popokabaka"
    ],
    "Kasongo-Lunda": [
      "Kasongo-Lunda"
    ],
    "Popokabaka": [
      "Popokabaka",
      "Mbala-Moso"
    ],
    "Kenge": [
      "Kenge",
      "Wamba"
    ]
  },
  "Mai-Ndombe": {
    "Bolobo": [
      "Bolobo",
      "Yumbi"
    ],
    "Inongo": [
      "Inongo",
      "Kiri"
    ],
    "Kwamouth": [
      "Kwamouth",
      "Nioki"
    ],
    "Kutu": [
      "Kutu",
      "Oshwe"
    ],
    "Mushie": [
      "Mushie",
      "Bolobo"
    ]
  },
  "Lomami": {
    "Kabinda": [
      "Kabinda",
      "Lomela"
    ],
    "Kamiji": [
      "Kamiji",
      "Ngandajika"
    ],
    "Lubao": [
      "Lubao",
      "Katompe"
    ],
    "Ngandajika": [
      "Ngandajika",
      "Katanda"
    ]
  },
  "Sankuru": {
    "Katako-Kombe": [
      "Katako-Kombe",
      "Wembo-Nyama"
    ],
    "Kole": [
      "Kole",
      "Dekese"
    ],
    "Lomela": [
      "Lomela",
      "Tshumbe"
    ],
    "Lubefu": [
      "Lubefu",
      "Katanda"
    ],
    "Lodja": [
      "Lodja",
      "Lomela"
    ]
  },
  "Tanganyika": {
    "Manono": [
      "Manono",
      "Kiambi"
    ],
    "Moba": [
      "Moba",
      "Pweto"
    ],
    "Nyunzu": [
      "Nyunzu",
      "Kabalo"
    ],
    "Kalemie": [
      "Kalemie",
      "Moba"
    ],
    "Kongolo": [
      "Kongolo",
      "Samba"
    ]
  },
  "Haut-Lomami": {
    "Bukama": [
      "Bukama",
      "Kaniama"
    ],
    "Kabongo": [
      "Kabongo",
      "Malemba-Nkulu"
    ],
    "Kaniama": [
      "Kaniama",
      "Mulongo"
    ],
    "Malemba-Nkulu": [
      "Malemba-Nkulu",
      "Kabongo"
    ],
    "Kamina": [
      "Kamina",
      "Bukama"
    ]
  },
  "Mongala": {
    "Bongandanga": [
      "Bongandanga",
      "Bikoro"
    ],
    "Bumba": [
      "Bumba",
      "Ebonda"
    ],
    "Lisala": [
      "Lisala",
      "Bongandanga"
    ],
    "Mongala": [
      "Mongala",
      "Yalifafu"
    ]
  },
  "Nord-Ubangi": {
    "Bosobolo": [
      "Bosobolo",
      "Businga"
    ],
    "Businga": [
      "Businga",
      "Yakoma"
    ],
    "Gbadolite": [
      "Gbadolite",
      "Mobayi-Mbongo"
    ],
    "Mobayi-Mbongo": [
      "Mobayi-Mbongo",
      "Bosobolo"
    ]
  },
  "Sud-Ubangi": {
    "Budjala": [
      "Budjala",
      "Kungu"
    ],
    "Gemena": [
      "Gemena",
      "Libenge"
    ],
    "Kungu": [
      "Kungu",
      "Gwaka"
    ],
    "Libenge": [
      "Libenge",
      "Yakoma"
    ]
  },
  "Équateur": {
    "Basankusu": [
      "Basankusu",
      "Bolomba"
    ],
    "Bikoro": [
      "Bikoro",
      "Inongo"
    ],
    "Bomongo": [
      "Bomongo",
      "Lukolela"
    ],
    "Ingende": [
      "Ingende",
      "Bikoro"
    ],
    "Lukolela": [
      "Lukolela",
      "Makanza"
    ],
    "Makanza": [
      "Makanza",
      "Basankusu"
    ]
  },
  "Tshuapa": {
    "Befale": [
      "Befale",
      "Djolu"
    ],
    "Boende": [
      "Boende",
      "Befale"
    ],
    "Bokungu": [
      "Bokungu",
      "Ikela"
    ],
    "Djolu": [
      "Djolu",
      "Monkoto"
    ],
    "Ikela": [
      "Ikela",
      "Losombo"
    ],
    "Monkoto": [
      "Monkoto",
      "Djolu"
    ]
  }
};

const normProv = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

const findKey = <T>(obj: Record<string, T>, province: string): T | undefined => {
  const k = Object.keys(obj).find((p) => normProv(p) === normProv(province));
  return k ? obj[k] : undefined;
};

export const landDistrictsFor = (province: string): string[] => findKey(LAND_DISTRICTS_BY_PROVINCE, province) ?? [];
export const ruralTerritoriesFor = (province: string): Record<string, string[]> => findKey(RURAL_TERRITORIES_BY_PROVINCE, province) ?? {};
