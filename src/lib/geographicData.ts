// Structure hiérarchique pour les données géographiques de la RDC

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
      "Masisi": ["Bashali-Kaembe", "Bashali-Mokoto", "Katoyi", "Kisimba-Ikobo", "Luholu", "Osso-Banyungu"],
      "Rutshuru": ["Bwisha", "Bwito", "Jomba", "Kiwanja", "Nyamilima"],
      "Nyiragongo": ["Kibumba", "Rugari", "Busanza"],
      "Walikale": ["Bakano", "Ikobo", "Wanianga", "Bakano-Pinga"],
      "Lubero": ["Bapakombe", "Bapere", "Baswaga", "Batangi", "Bamate"],
      "Beni": ["Bashu", "Bapakombe", "Babila-Bakeulu"],
      "Oicha": ["Watalinga", "Bashu"]
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
