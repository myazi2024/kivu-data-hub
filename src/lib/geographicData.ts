// Structure hiérarchique pour les données géographiques de la RDC

export interface QuartierAvenue {
  [quartier: string]: string[]; // avenues par quartier
}

export interface CommuneQuartiers {
  [commune: string]: QuartierAvenue;
}

export interface VilleCommunes {
  [ville: string]: CommuneQuartiers;
}

export interface GeographicHierarchy {
  [province: string]: {
    villes: {
      [ville: string]: string[]; // communes
    };
    territoires: {
      [territoire: string]: string[]; // collectivités principales
    };
  };
}

export const geographicData: GeographicHierarchy = {
  "Nord-Kivu": {
    villes: {
      "Goma": ["Goma", "Karisimbi"],
      "Butembo": ["Bulengera", "Kimemi", "Mususa", "Vulamba"],
      "Beni": ["Beu", "Mulekera", "Ruwenzori"]
    },
    territoires: {
      "Masisi": ["Bashali-Kaembe", "Bashali-Mokoto", "Katoyi", "Kisimba-Ikobo", "Luholu", "Osso-Banyungu", "Bahunde-Nord", "Bahunde-Sud"],
      "Rutshuru": ["Bwisha", "Bwito", "Jomba", "Kiwanja", "Nyamilima", "Bukoma", "Bwito", "Kisigari"],
      "Nyiragongo": ["Kibumba", "Rugari", "Busanza", "Kibati", "Munigi"],
      "Walikale": ["Bakano", "Ikobo", "Wanianga", "Bakano-Pinga", "Osso", "Walikale-Centre"],
      "Lubero": ["Bapakombe", "Bapere", "Baswaga", "Batangi", "Bamate", "Banyungu", "Batangi", "Lubero-Centre"],
      "Beni": ["Bashu", "Bapakombe", "Babila-Bakeulu", "Beni-Centre", "Bashu-Kikingi"],
      "Oicha": ["Watalinga", "Bashu", "Beni-Mbau"]
    }
  },
  "Sud-Kivu": {
    villes: {
      "Bukavu": ["Ibanda", "Bagira", "Kadutu"],
      "Uvira": ["Mulongwe", "Kalundu", "Kasenga"]
    },
    territoires: {
      "Fizi": ["Tangani'a", "Mutambala", "Ngandja", "Ebuela"],
      "Uvira": ["Bafuliiru", "Bavira", "Banyindu", "Ruzizi"],
      "Mwenga": ["Burhinyi", "Itombwe", "Lwindi"],
      "Shabunda": ["Bakisi", "Balowa", "Wamuzila"],
      "Walungu": ["Ngweshe", "Kaziba", "Kaniola"],
      "Kabare": ["Kabare", "Nindja", "Kalehe-Centre"],
      "Kalehe": ["Bunyakiri", "Bugobe", "Kalehe-Nyamasasa"],
      "Idjwi": ["Rubenga", "Ntambuka"]
    }
  },
  "Kinshasa": {
    villes: {
      "Kinshasa": [
        "Bandalungwa", "Barumbu", "Bumbu", "Gombe", "Kalamu",
        "Kasa-Vubu", "Kimbanseke", "Kinshasa", "Kintambo", "Kisenso",
        "Lemba", "Limete", "Lingwala", "Makala", "Maluku",
        "Masina", "Matete", "Mont-Ngafula", "Ndjili", "Ngaba",
        "Ngaliema", "Ngiri-Ngiri", "Nsele", "Selembao"
      ]
    },
    territoires: {}
  },
  "Kongo-Central": {
    villes: {
      "Matadi": ["Matadi", "Nzanza"],
      "Boma": ["Boma", "Kalamu"],
      "Mbanza-Ngungu": ["Mbanza-Ngungu"]
    },
    territoires: {
      "Kasangulu": ["Kasangulu", "Ngeba"],
      "Madimba": ["Madimba", "Kimpese"],
      "Lukula": ["Lukula", "Tshela"],
      "Tshela": ["Tshela", "Loango"],
      "Songololo": ["Songololo", "Kimvula"]
    }
  },
  "Kwilu": {
    villes: {
      "Kikwit": ["Kikwit", "Lukemi", "Nzinda"]
    },
    territoires: {
      "Bulungu": ["Bulungu", "Kipuka"],
      "Gungu": ["Gungu", "Kiyaka"],
      "Idiofa": ["Idiofa", "Yasa-Bonga"],
      "Masi-Manimba": ["Masi-Manimba", "Kinzau-Vuete"],
      "Bagata": ["Bagata", "Kwilu-Ngongo"]
    }
  },
  "Haut-Katanga": {
    villes: {
      "Lubumbashi": ["Annexe", "Kampemba", "Katuba", "Kenya", "Lubumbashi", "Rwashi", "Kamalondo"],
      "Likasi": ["Kikula", "Likasi", "Panda"],
      "Kipushi": ["Kipushi"]
    },
    territoires: {
      "Kambove": ["Kambove", "Kasenga"],
      "Mitwaba": ["Mitwaba", "Pweto"],
      "Pweto": ["Pweto", "Kilwa"],
      "Sakania": ["Sakania"]
    }
  },
  "Lualaba": {
    villes: {
      "Kolwezi": ["Dilala", "Manika", "Mutoshi"],
      "Fungurume": ["Fungurume"]
    },
    territoires: {
      "Mutshatsha": ["Mutshatsha", "Kafakumba"],
      "Kaponga": ["Kaponga", "Sandoa"],
      "Dilolo": ["Dilolo"]
    }
  },
  "Ituri": {
    villes: {
      "Bunia": ["Bankoko", "Kindia", "Lembabo", "Saio"]
    },
    territoires: {
      "Djugu": ["Bahema Nord", "Bahema Sud", "Walendu-Bindi"],
      "Irumu": ["Bahema-Banywagi", "Wamba"],
      "Mambasa": ["Babila-Babombi", "Walese-Vonkutu"],
      "Mahagi": ["Panduru", "Wanyali-Tchakpi"],
      "Aru": ["Aru", "Logoro"]
    }
  },
  "Tshopo": {
    villes: {
      "Kisangani": ["Kabondo", "Kisangani", "Lubunga", "Makiso", "Mangobo", "Tshopo"]
    },
    territoires: {
      "Banalia": ["Babombi", "Babila"],
      "Basoko": ["Basoko", "Yatolema"],
      "Bafwasende": ["Bafwasende", "Babombi"],
      "Ubundu": ["Ubundu", "Wanie-Rukula"],
      "Isangi": ["Isangi", "Yaselia"]
    }
  },
  "Kasaï": {
    villes: {
      "Tshikapa": ["Tshikapa"]
    },
    territoires: {
      "Dekese": ["Dekese", "Bena-Leka"],
      "Dimbelenge": ["Dimbelenge"],
      "Ilebo": ["Ilebo", "Bena-Dibele"],
      "Kamonia": ["Kamonia", "Luiza"],
      "Luebo": ["Luebo", "Territoire"]
    }
  },
  "Kasaï-Central": {
    villes: {
      "Kananga": ["Kananga", "Katoka", "Lukonga", "Ndesha"]
    },
    territoires: {
      "Demba": ["Demba", "Dibaya"],
      "Dibaya": ["Dibaya", "Diulu"],
      "Dimbelenge": ["Dimbelenge", "Miabi"],
      "Kazumba": ["Kazumba", "Luiza"],
      "Luiza": ["Luiza", "Kamuesha"]
    }
  },
  "Kasaï-Oriental": {
    villes: {
      "Mbuji-Mayi": ["Bipemba", "Dibindi", "Diulu", "Kanshi", "Muya"]
    },
    territoires: {
      "Kabeya-Kamwanga": ["Kabeya-Kamwanga"],
      "Katanda": ["Katanda", "Tshilenge"],
      "Lupatapata": ["Lupatapata"],
      "Miabi": ["Miabi", "Tshitenge"],
      "Tshilenge": ["Tshilenge", "Luputa"]
    }
  },
  "Maniema": {
    villes: {
      "Kindu": ["Alunguli", "Kasuku", "Mikelenge"]
    },
    territoires: {
      "Kabambare": ["Kabambare", "Samba"],
      "Kailo": ["Kailo", "Kunda"],
      "Kasongo": ["Kasongo", "Samba"],
      "Kibombo": ["Kibombo", "Katako-Kombe"],
      "Lubutu": ["Lubutu", "Oso"],
      "Pangi": ["Pangi", "Kasese"],
      "Punia": ["Punia", "Wamaza"]
    }
  },
  "Haut-Uele": {
    villes: {
      "Isiro": ["Isiro"]
    },
    territoires: {
      "Dungu": ["Dungu", "Bangadi"],
      "Faradje": ["Faradje"],
      "Niangara": ["Niangara", "Bangadi"],
      "Rungu": ["Rungu", "Doruma"],
      "Wamba": ["Wamba", "Poko"],
      "Watsa": ["Watsa", "Ango"]
    }
  },
  "Bas-Uele": {
    villes: {
      "Buta": ["Buta"]
    },
    territoires: {
      "Aketi": ["Aketi", "Likati"],
      "Ango": ["Ango", "Bambesa"],
      "Bambesa": ["Bambesa", "Titule"],
      "Bondo": ["Bondo", "Bozene"],
      "Poko": ["Poko", "Gwane"]
    }
  },
  "Kwango": {
    villes: {
      "Kenge": ["Kenge"]
    },
    territoires: {
      "Feshi": ["Feshi", "Lusanga"],
      "Kahemba": ["Kahemba", "Popokabaka"],
      "Kasongo-Lunda": ["Kasongo-Lunda"],
      "Popokabaka": ["Popokabaka", "Mbala-Moso"],
      "Kenge": ["Kenge", "Wamba"]
    }
  },
  "Mai-Ndombe": {
    villes: {
      "Inongo": ["Inongo"]
    },
    territoires: {
      "Bolobo": ["Bolobo", "Yumbi"],
      "Inongo": ["Inongo", "Kiri"],
      "Kwamouth": ["Kwamouth", "Nioki"],
      "Kutu": ["Kutu", "Oshwe"],
      "Mushie": ["Mushie", "Bolobo"]
    }
  },
  "Lomami": {
    villes: {
      "Mwene-Ditu": ["Mwene-Ditu"]
    },
    territoires: {
      "Kabinda": ["Kabinda", "Lomela"],
      "Kamiji": ["Kamiji", "Ngandajika"],
      "Lubao": ["Lubao", "Katompe"],
      "Ngandajika": ["Ngandajika", "Katanda"]
    }
  },
  "Sankuru": {
    villes: {
      "Lodja": ["Lodja"]
    },
    territoires: {
      "Katako-Kombe": ["Katako-Kombe", "Wembo-Nyama"],
      "Kole": ["Kole", "Dekese"],
      "Lomela": ["Lomela", "Tshumbe"],
      "Lubefu": ["Lubefu", "Katanda"],
      "Lodja": ["Lodja", "Lomela"]
    }
  },
  "Tanganyika": {
    villes: {
      "Kalemie": ["Kalemie"],
      "Kabalo": ["Kabalo"]
    },
    territoires: {
      "Manono": ["Manono", "Kiambi"],
      "Moba": ["Moba", "Pweto"],
      "Nyunzu": ["Nyunzu", "Kabalo"],
      "Kalemie": ["Kalemie", "Moba"],
      "Kongolo": ["Kongolo", "Samba"]
    }
  },
  "Haut-Lomami": {
    villes: {
      "Kamina": ["Kamina"]
    },
    territoires: {
      "Bukama": ["Bukama", "Kaniama"],
      "Kabongo": ["Kabongo", "Malemba-Nkulu"],
      "Kaniama": ["Kaniama", "Mulongo"],
      "Malemba-Nkulu": ["Malemba-Nkulu", "Kabongo"],
      "Kamina": ["Kamina", "Bukama"]
    }
  },
  "Mongala": {
    villes: {
      "Lisala": ["Lisala"]
    },
    territoires: {
      "Bongandanga": ["Bongandanga", "Bikoro"],
      "Bumba": ["Bumba", "Ebonda"],
      "Lisala": ["Lisala", "Bongandanga"],
      "Mongala": ["Mongala", "Yalifafu"]
    }
  },
  "Nord-Ubangi": {
    villes: {
      "Gbadolite": ["Gbadolite"]
    },
    territoires: {
      "Bosobolo": ["Bosobolo", "Businga"],
      "Businga": ["Businga", "Yakoma"],
      "Gbadolite": ["Gbadolite", "Mobayi-Mbongo"],
      "Mobayi-Mbongo": ["Mobayi-Mbongo", "Bosobolo"]
    }
  },
  "Sud-Ubangi": {
    villes: {
      "Gemena": ["Gemena"],
      "Zongo": ["Zongo"]
    },
    territoires: {
      "Budjala": ["Budjala", "Kungu"],
      "Gemena": ["Gemena", "Libenge"],
      "Kungu": ["Kungu", "Gwaka"],
      "Libenge": ["Libenge", "Yakoma"]
    }
  },
  "Équateur": {
    villes: {
      "Mbandaka": ["Mbandaka"]
    },
    territoires: {
      "Basankusu": ["Basankusu", "Bolomba"],
      "Bikoro": ["Bikoro", "Inongo"],
      "Bomongo": ["Bomongo", "Lukolela"],
      "Ingende": ["Ingende", "Bikoro"],
      "Lukolela": ["Lukolela", "Makanza"],
      "Makanza": ["Makanza", "Basankusu"]
    }
  },
  "Tshuapa": {
    villes: {
      "Boende": ["Boende"]
    },
    territoires: {
      "Befale": ["Befale", "Djolu"],
      "Boende": ["Boende", "Befale"],
      "Bokungu": ["Bokungu", "Ikela"],
      "Djolu": ["Djolu", "Monkoto"],
      "Ikela": ["Ikela", "Losombo"],
      "Monkoto": ["Monkoto", "Djolu"]
    }
  }
};

// Helper functions
export const getVillesForProvince = (province: string): string[] => {
  const data = geographicData[province];
  return data ? Object.keys(data.villes) : [];
};

export const getCommunesForVille = (province: string, ville: string): string[] => {
  const data = geographicData[province];
  return data?.villes[ville] || [];
};

export const getTerritoiresForProvince = (province: string): string[] => {
  const data = geographicData[province];
  return data ? Object.keys(data.territoires) : [];
};

export const getCollectivitesForTerritoire = (province: string, territoire: string): string[] => {
  const data = geographicData[province];
  return data?.territoires[territoire] || [];
};

export const getAllProvinces = (): string[] => {
  return Object.keys(geographicData);
};

// Données détaillées des quartiers et avenues par ville
export const quartiersAvenuesData: { [province: string]: VilleCommunes } = {
  "Nord-Kivu": {
    "Goma": {
      "Goma": {
        "Himbi": ["Avenue de l'Indépendance", "Avenue Mobutu", "Avenue de la Paix", "Avenue Rond-Point", "Avenue Président"],
        "Les Volcans": ["Avenue du Rond-Point", "Avenue de l'Aéroport", "Avenue Mama Yemo", "Avenue BCDC", "Boulevard Kanyamuhanga"],
        "Katindo": ["Avenue Katindo", "Avenue Munene", "Avenue Mapendo", "Avenue Birere", "Avenue du Lac"],
        "Ndosho": ["Avenue Ndosho", "Avenue Maman Olive", "Avenue de la Frontière", "Avenue Ndosho", "Avenue de l'Amitié"],
        "Kasika": ["Avenue Kasika", "Avenue Keshero", "Avenue Mutiri", "Avenue Mabanga", "Avenue Saké"],
        "Majengo": ["Avenue Majengo", "Avenue de la Révolution", "Avenue du Travail", "Avenue du Commerce", "Avenue Maman Mobutu"],
        "Murara": ["Avenue Murara", "Avenue Masisi", "Avenue Rutshuru"],
        "Mikeno": ["Avenue Mikeno", "Avenue Mugunga", "Avenue Sake"]
      },
      "Karisimbi": {
        "Kahembe": ["Avenue Kahembe", "Avenue Mikeno", "Avenue Nyiragongo", "Avenue Kahuzi", "Avenue Biega"],
        "Katoyi": ["Avenue Katoyi", "Avenue Mugunga", "Avenue Lac Vert", "Avenue Mabanga Nord"],
        "Mugunga": ["Avenue Mugunga", "Avenue de la Paix", "Avenue Unity", "Avenue Lac Kivu"],
        "Virunga": ["Avenue Virunga", "Avenue Muhabura", "Avenue Karisimbi", "Avenue Sabyinyo"],
        "Kyeshero": ["Avenue Kyeshero", "Avenue de l'Université", "Avenue UNIGOM", "Avenue Université Libre des Pays des Grands Lacs"],
        "Bujovu": ["Avenue Bujovu", "Avenue Mabanga Sud", "Avenue Mugunga"],
        "Majengo": ["Avenue Kanyamuhanga", "Avenue Goma", "Avenue Bulengo"]
      }
    },
    "Butembo": {
      "Bulengera": {
        "Bulengera Centre": ["Avenue Bulengera", "Avenue Musienene", "Avenue Kalau"],
        "Kalengera": ["Avenue Kalengera", "Avenue de la Victoire"],
        "Kambali": ["Avenue Kambali", "Avenue Kimemi"]
      },
      "Kimemi": {
        "Kimemi Centre": ["Avenue Kimemi", "Avenue Isale", "Avenue Kawaya"],
        "Kikyo": ["Avenue Kikyo", "Avenue du 30 Juin"],
        "Kagheri": ["Avenue Kagheri", "Avenue Katolo"]
      }
    }
  },
  "Sud-Kivu": {
    "Bukavu": {
      "Ibanda": {
        "Panzi": ["Avenue Panzi", "Avenue Hôpital", "Avenue Dr. Mukwege"],
        "Nyamugo": ["Avenue Nyamugo", "Avenue Essence", "Avenue Nguba"],
        "Ndendere": ["Avenue Ndendere", "Avenue Funu", "Avenue de la Mission"]
      },
      "Bagira": {
        "Bagira Centre": ["Avenue Bagira", "Avenue Lumumba", "Avenue Nyawera"],
        "Mudaka": ["Avenue Mudaka", "Avenue Cimetière", "Avenue Kasha"],
        "Nyalukemba": ["Avenue Nyalukemba", "Avenue Ruzizi", "Avenue du Marché"]
      },
      "Kadutu": {
        "Kadutu Centre": ["Avenue Kadutu", "Avenue de la Paix", "Avenue Mulengeza"],
        "Nyamugo": ["Avenue Nyamugo", "Avenue Clinique", "Avenue Radar"],
        "Essence": ["Avenue Essence", "Avenue du Lac", "Avenue OCC"]
      }
    }
  },
  "Kinshasa": {
    "Kinshasa": {
      "Gombe": {
        "Centre-Ville": ["Boulevard du 30 Juin", "Avenue de la Justice", "Avenue de la Paix", "Avenue des Aviateurs", "Avenue Colonel Ebeya"],
        "Socimat": ["Avenue Socimat", "Avenue Tombalbaye", "Avenue Kasa-Vubu", "Avenue Roi Baudouin"],
        "Huileries": ["Avenue Huileries", "Avenue Colonel Mondjiba", "Avenue Wagenia", "Avenue Kasa-Vubu"],
        "Quartier Administratif": ["Boulevard du 30 Juin", "Avenue de la Nation", "Avenue Colonel Tshatshi"],
        "Ambassades": ["Avenue Wagenia", "Avenue de la Gombe", "Avenue Lokele"]
      },
      "Kalamu": {
        "Matonge": ["Avenue Kasa-Vubu", "Avenue de la Victoire", "Avenue Tabora", "Avenue Kassai", "Rue Aketi"],
        "Yolo": ["Avenue Yolo Nord", "Avenue Yolo Sud", "Avenue de la Libération", "Avenue Faradje"],
        "Victoire": ["Avenue de la Victoire", "Avenue Luambo Makiadi", "Avenue Musique", "Avenue Kinshasa"],
        "Salongo": ["Avenue Salongo", "Avenue Kabambare", "Avenue Kampemba"],
        "Joli Parc": ["Avenue Joli Parc", "Avenue Kasa-Vubu", "Avenue Colonel Mondjiba"]
      },
      "Ngaliema": {
        "Mont-Fleury": ["Avenue Mont-Fleury", "Avenue de la Gombe", "Avenue Pumbu", "Avenue de la Révolution"],
        "Binza": ["Avenue Binza", "Avenue de l'Université", "Avenue UNIKIN", "Avenue de la Science"],
        "Camp Luka": ["Avenue Camp Luka", "Avenue Saio", "Avenue Monastère", "Avenue Missionnaire"],
        "Selembao": ["Avenue Selembao", "Avenue de la Fraternité", "Avenue de l'Unité"],
        "Kinsuka": ["Avenue Kinsuka", "Avenue du Fleuve", "Avenue des Pêcheurs"]
      },
      "Limete": {
        "Limete Industriel": ["Avenue Industrielle", "Avenue de l'Usine", "Avenue Kingabwa", "Boulevard Lumumba"],
        "Limete Résidentiel": ["Avenue Bokasa", "Avenue Kimpwanza", "Avenue Mulumba", "Avenue Colonel Ebeya"],
        "Kingabwa": ["Avenue Kingabwa", "Avenue de la Fraternité", "Avenue Ma Campagne", "Avenue du Port"]
      },
      "Bandalungwa": {
        "Bandalungwa Centre": ["Avenue Kabinda", "Avenue Luozi", "Avenue Kasai"],
        "Mfumu Muanda": ["Avenue Mfumu Muanda", "Avenue de la Libération"],
        "Kalina": ["Avenue Kalina", "Avenue Kikwit", "Avenue Kinshasa"]
      },
      "Barumbu": {
        "Barumbu Centre": ["Avenue Kalemie", "Avenue Lubumbashi", "Avenue Barumbu"],
        "Mongo": ["Avenue Mongo", "Avenue Kasavubu", "Avenue du 24 Novembre"]
      },
      "Kintambo": {
        "Kintambo Centre": ["Avenue Colonel Ebeya", "Boulevard Triomphal", "Avenue Kintambo"],
        "Magasin": ["Avenue Magasin", "Avenue Kasa-Vubu", "Avenue du Port"],
        "Ngaba": ["Avenue Ngaba", "Avenue de la Libération", "Avenue Mama Yemo"]
      },
      "Lemba": {
        "Lemba Centre": ["Avenue Assossa", "Avenue Lemba", "Avenue Matadi"],
        "Salongo": ["Avenue Salongo", "Avenue Righini", "Avenue Kikwit"],
        "Binza Météo": ["Avenue Météo", "Avenue Kimwenza", "Avenue Lemba"]
      },
      "Matete": {
        "Matete Centre": ["Avenue de la Paix", "Avenue Matete", "Avenue Ngafani"],
        "Bibua": ["Avenue Bibua", "Avenue de la Justice", "Avenue Colonel Ebeya"],
        "Bumbu": ["Avenue Bumbu", "Avenue Mitendi", "Avenue Makala"]
      },
      "Ngiri-Ngiri": {
        "Ngiri Centre": ["Avenue Ngiri", "Avenue du Port", "Avenue Kinshasa"],
        "Ngwizani": ["Avenue Ngwizani", "Avenue du Fleuve", "Avenue de l'Unité"]
      },
      "Kimbanseke": {
        "Kimbanseke Centre": ["Avenue Luozi", "Avenue Kimbanseke", "Avenue Matadi"],
        "Salongo": ["Avenue Salongo", "Avenue Kikimi", "Avenue Ngafani"]
      },
      "Masina": {
        "Masina Centre": ["Avenue Masina", "Avenue de l'Aéroport", "Avenue Kinshasa"],
        "Kingabwa": ["Avenue Kingabwa", "Avenue Kimbwala", "Boulevard Lumumba"]
      },
      "Ndjili": {
        "Ndjili Centre": ["Avenue Ndjili", "Avenue de l'Aéroport", "Avenue Kimbanseke"],
        "Mitendi": ["Avenue Mitendi", "Avenue Ndjili", "Avenue Masina"]
      },
      "Lingwala": {
        "Lingwala Centre": ["Avenue Bokasa", "Avenue Lingwala", "Avenue Kinshasa"],
        "Quartier Industriel": ["Avenue Industrielle", "Avenue du Port"]
      }
    }
  },
  "Haut-Katanga": {
    "Lubumbashi": {
      "Lubumbashi": {
        "Centre-Ville": ["Avenue Moero", "Avenue Kasai", "Avenue Lumumba", "Boulevard Kamanyola"],
        "Commerce": ["Avenue du Commerce", "Avenue Tabora", "Avenue du Marché"],
        "Golf": ["Avenue Golf", "Avenue Likasi", "Avenue Kasapa"]
      },
      "Katuba": {
        "Katuba Centre": ["Avenue Katuba", "Avenue de l'Aéroport", "Avenue Kamalondo"],
        "Kamalondo": ["Avenue Kamalondo", "Avenue Kasapa", "Avenue Tshamilemba"],
        "Golf": ["Avenue Golf", "Avenue Kaponda", "Avenue Munua"]
      },
      "Kenya": {
        "Kenya Centre": ["Avenue Kenya", "Avenue Kasenga", "Avenue de la Frontière"],
        "Kampemba": ["Avenue Kampemba", "Avenue Kabalo", "Avenue Lufira"],
        "Kasapa": ["Avenue Kasapa", "Avenue Kisanga", "Avenue Likasi"]
      }
    }
  }
};

// Helper functions pour quartiers et avenues
export const getQuartiersForCommune = (province: string, ville: string, commune: string): string[] => {
  const villeData = quartiersAvenuesData[province]?.[ville];
  if (!villeData || !villeData[commune]) return [];
  return Object.keys(villeData[commune]);
};

export const getAvenuesForQuartier = (province: string, ville: string, commune: string, quartier: string): string[] => {
  const communeData = quartiersAvenuesData[province]?.[ville]?.[commune];
  if (!communeData) return [];
  return communeData[quartier] || [];
};
