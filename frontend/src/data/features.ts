export type Feature = {
  title: string
  chip: string
  text: string
  meta: [string, string]
  img: string
  alt: string
}

export const FEATURES: Feature[] = [
  {
    title: 'Aqlli svetofor',
    chip: 'DQN',
    text: 'Neyron tarmoq navbatni ko‘rib, yashil chiroq qancha yonishini o‘zi tanlaydi.',
    meta: ['3 kirish', '4 harakat'],
    img: '/photos/tlNight.webp',
    alt: 'Tunda yashil yongan svetofor',
  },
  {
    title: 'Chorraha tahlili',
    chip: 'Jonli',
    text: 'Har yo‘nalishdagi navbat va kutish vaqti har 2 soniyada yangilanadi.',
    meta: ['NS · EW', '2 s'],
    img: '/photos/aerial.webp',
    alt: 'Gavjum chorraha tepadan',
  },
  {
    title: 'Tirbandlik zonalari',
    chip: 'DBSCAN',
    text: 'Zichlikka asoslangan klasterlash xaritada tirbandlik o‘choqlarini topadi.',
    meta: ['Klasterlar', 'Shovqin filtri'],
    img: '/photos/nightHw.webp',
    alt: 'Tungi shahar yo‘llari tepadan',
  },
  {
    title: 'Yashil to‘lqin',
    chip: 'Tez yordam',
    text: 'Marshrutdagi svetoforlar mashina yetib kelishidan 30 soniya oldin yashilga o‘tadi.',
    meta: ['30 s oldin', 'Ustuvorlik'],
    img: '/photos/amb.webp',
    alt: 'Chiroqlari yongan tez yordam mashinasi',
  },
  {
    title: 'GPS kuzatuv',
    chip: 'Mobil',
    text: 'Har qanday telefon brauzer orqali tizimga real mashina sifatida ulanadi.',
    meta: ['Brauzer', '1 s'],
    img: '/photos/phone.webp',
    alt: 'Navigatsiya xaritasi ochiq telefon',
  },
  {
    title: 'O‘zbekcha yordamchi',
    chip: 'NLP',
    text: 'Haydovchi oddiy tilda so‘raydi — tizim jonli xarita asosida javob beradi.',
    meta: ['Chat', 'O‘zbek tili'],
    img: '/photos/tcity.webp',
    alt: 'Toshkent City minoralari',
  },
]
