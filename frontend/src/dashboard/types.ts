/* docs/dashboard-api.md kontrakti */
export type Mode = 'ai' | 'fixed'
export type Axis = 'NS' | 'EW'
export type LatLng = [number, number]

export type Vehicle = {
  id: string
  lat: number
  lng: number
  heading: number
  speed: number
  type: 'car' | 'bus' | 'truck' | 'ambulance'
  emergency: boolean
}

export type Intersection = {
  id: string
  name: string
  lat: number
  lng: number
  phase: Axis
  state: 'green' | 'yellow' | 'allred'
  remaining: number
  queue: { ns: number; ew: number }
  wait: number
  action: 0 | 1 | 2 | 3
  q: [number, number, number, number]
  preempted: boolean
}

export type Zone = { id: string; lat: number; lng: number; radius: number; count: number; level: 'light' | 'moderate' | 'heavy' }
export type Emergency = { id: string; route: LatLng[]; intersections: string[]; eta: number; vehicleId: string }
export type DashEvent = { id: string; t: string; kind: 'phase' | 'zone' | 'emergency' | 'mode' | 'gps'; text: string; intersectionId?: string }

export type Snapshot = {
  t: string
  mode: Mode
  stats: { vehicles: number; avgSpeed: number; avgWait: number; avgWaitAi: number; avgWaitFixed: number; congestion: number }
  vehicles: Vehicle[]
  intersections: Intersection[]
  zones: Zone[]
  emergency: Emergency | null
  events: DashEvent[]
}

export const ACTIONS = ['NS · 15 s', 'EW · 15 s', 'NS · 30 s', 'EW · 30 s'] as const

/* Chorraha holati chegaralari (ikki yo‘nalishdagi jami navbat) */
export const ORTACHA = 4
export const TIRBAND = 9

/* Backend kontraktga mos javob qaytaryaptimi (eski server boshqa shakl yuboradi) */
export function isSnapshot(x: unknown): x is Snapshot {
  const s = x as Snapshot
  return !!s && Array.isArray(s.intersections) && Array.isArray(s.vehicles) && typeof s.stats === 'object' && (s.mode === 'ai' || s.mode === 'fixed')
}
