/* Mashina “egasi” — TO‘QIMA ma’lumot. Simulyatsiyadagi mashinalarning haqiqiy egasi yo‘q;
   ism, raqam va model mashina id’sidan deterministik yasaladi (har ochilganda bir xil chiqadi).
   Haqiqiy tizimda egasi haqidagi ma’lumot shaxsiy ma’lumot hisoblanadi — faqat qonuniy asos va
   ruxsat bilan, alohida himoyalangan manbadan olinishi kerak. */

const MALE = ['Aziz', 'Bekzod', 'Dilshod', 'Jasur', 'Otabek', 'Sardor', 'Shoxrux', 'Ulug‘bek', 'Javohir', 'Nodir', 'Sherzod', 'Akmal']
const FEMALE = ['Malika', 'Dilnoza', 'Nilufar', 'Gulnora', 'Shahnoza', 'Madina', 'Zarina', 'Sevara']
const SURNAMES = ['Karimov', 'Rahimov', 'Yusupov', 'Aliyev', 'Tursunov', 'Nazarov', 'Ergashev', 'Saidov', 'Xolmatov', 'Abdullayev', 'Mirzayev', 'Qodirov']
const MODELS = ['Chevrolet Cobalt', 'Chevrolet Nexia 3', 'Chevrolet Spark', 'Chevrolet Gentra', 'Chevrolet Malibu', 'Chevrolet Tracker', 'Chevrolet Onix', 'Chevrolet Damas', 'BYD Song Plus', 'Kia K5']
const LETTERS = 'ABCDEFHKMNOPTXYZ'
// carLayer palitrasi tartibida
export const COLOR_NAMES = ['Oq', 'Oq', 'Kumush', 'Oq', 'Kumush', 'Qora', 'Kulrang', 'To‘q ko‘k', 'Qizil', 'Bej']

export type Owner = { name: string; plate: { region: string; rest: string }; model: string; kind: 'Shaxsiy' | 'Taksi' | 'Xizmat' }

export function ownerOf(slot: number, gen: number): Owner {
  let h = (slot * 7919 + gen * 104729 + 17) >>> 0
  const rnd = () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) + 3266489909) >>> 0
    return (h >>> 0) / 4294967296
  }
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
  const female = rnd() < 0.3
  const name = `${pick(female ? FEMALE : MALE)} ${pick(SURNAMES)}${female ? 'a' : ''}`
  const roll = rnd()
  const kind: Owner['kind'] = roll < 0.72 ? 'Shaxsiy' : roll < 0.92 ? 'Taksi' : 'Xizmat'
  const region = rnd() < 0.8 ? '01' : '10' // Toshkent shahri / Toshkent viloyati
  const digits = String(100 + Math.floor(rnd() * 900))
  const L = () => LETTERS[Math.floor(rnd() * LETTERS.length)]
  // jismoniy shaxs: 01 A 123 BC; yuridik shaxs (xizmat): 01 123 ABC
  const rest = kind === 'Xizmat' ? `${digits} ${L()}${L()}${L()}` : `${L()} ${digits} ${L()}${L()}`
  return { name, plate: { region, rest }, model: pick(MODELS), kind }
}
