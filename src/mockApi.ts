import { defaultCity, isSupabaseConfigured, supabase } from './supabaseClient'
import type {
  AdminBooking,
  AdminMetric,
  Driver,
  DriverHirePackage,
  DriverShift,
  PaymentMethod,
  PickupRequest,
  Place,
  PlatformApplication,
  Ride,
  SupportTicket,
  User,
  VehicleOption,
  VeloraSnapshot,
} from './types'

type ApplicationInput = {
  role: PlatformApplication['role']
  name: string
  email: string
  phone: string
  vehicle?: string
  license?: string
}

type PickupRequestInput = Omit<PickupRequest, 'createdAt'>

const nowLabel = () =>
  new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

const newTextId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`

export const places: Place[] = [
  {
    id: 'p1',
    label: 'Bandra Kurla Complex',
    detail: 'Gate 2, BKC, Mumbai',
    coordinate: { lat: 19.0656, lng: 72.8625 },
    tag: 'Pickup',
  },
  {
    id: 'p2',
    label: 'CSMIA Terminal 2',
    detail: 'Chhatrapati Shivaji Maharaj International Airport',
    coordinate: { lat: 19.0896, lng: 72.8656 },
    tag: 'Airport',
  },
  {
    id: 'p3',
    label: 'Phoenix Palladium',
    detail: 'Lower Parel, Mumbai',
    coordinate: { lat: 18.9947, lng: 72.8258 },
    tag: 'Work',
  },
  {
    id: 'p4',
    label: 'Juhu Tara Road',
    detail: 'Juhu, Mumbai',
    coordinate: { lat: 19.0988, lng: 72.8267 },
    tag: 'Popular',
  },
]

export const vehicleOptions: VehicleOption[] = [
  {
    id: 'bike',
    kind: 'Bike',
    description: 'Fastest solo ride',
    seats: 1,
    etaMinutes: 3,
    fare: 94,
    previousFare: 118,
    badge: 'Quickest',
  },
  {
    id: 'auto',
    kind: 'Auto',
    description: 'Mumbai meter comfort',
    seats: 3,
    etaMinutes: 4,
    fare: 158,
    surge: 'Low surge',
  },
  {
    id: 'mini',
    kind: 'Mini',
    description: 'Compact AC cab',
    seats: 4,
    etaMinutes: 5,
    fare: 236,
  },
  {
    id: 'sedan',
    kind: 'Sedan',
    description: 'Premium daily cab',
    seats: 4,
    etaMinutes: 6,
    fare: 315,
    previousFare: 348,
    badge: 'Best value',
  },
  {
    id: 'suv',
    kind: 'SUV',
    description: 'Room for luggage',
    seats: 6,
    etaMinutes: 8,
    fare: 445,
  },
  {
    id: 'xl',
    kind: 'XL',
    description: 'Large group ride',
    seats: 7,
    etaMinutes: 10,
    fare: 520,
  },
  {
    id: 'ev',
    kind: 'EV',
    description: 'Quiet electric ride',
    seats: 4,
    etaMinutes: 9,
    fare: 302,
    carbon: '42% less CO2',
  },
  {
    id: 'parcel',
    kind: 'Parcel',
    description: 'Doorstep delivery',
    seats: 0,
    etaMinutes: 3,
    fare: 84,
  },
  {
    id: 'rentals',
    kind: 'Rentals',
    description: 'Hourly city package',
    seats: 4,
    etaMinutes: 12,
    fare: 1099,
    badge: '4 hr',
  },
  {
    id: 'outstation',
    kind: 'Outstation',
    description: 'Intercity trips',
    seats: 4,
    etaMinutes: 18,
    fare: 3190,
  },
  {
    id: 'driver',
    kind: 'Driver Hire',
    description: 'Verified driver only',
    seats: 0,
    etaMinutes: 10,
    fare: 599,
    badge: 'New',
  },
]

export const drivers: Driver[] = [
  {
    id: 'd1',
    name: 'Aarav Mehta',
    avatarColor: '#0f766e',
    rating: 4.92,
    trips: 3840,
    vehicle: 'Hyundai Aura',
    plate: 'MH 02 MX 4221',
    distance: '1.2 km away',
    phone: '+91 98765 42110',
    verified: true,
  },
  {
    id: 'd2',
    name: 'Nisha Rao',
    avatarColor: '#7c3aed',
    rating: 4.88,
    trips: 2110,
    vehicle: 'TVS iQube',
    plate: 'MH 04 EV 9120',
    distance: '0.8 km away',
    phone: '+91 99880 11223',
    verified: true,
  },
  {
    id: 'd3',
    name: 'Imran Shaikh',
    avatarColor: '#b45309',
    rating: 4.86,
    trips: 2917,
    vehicle: 'Mahindra Marazzo',
    plate: 'MH 01 AB 7754',
    distance: '2.6 km away',
    phone: '+91 90909 88771',
    verified: true,
  },
]

export const hirePackages: DriverHirePackage[] = [
  {
    id: 'hourly',
    title: 'Hourly Driver',
    duration: '2 hours / 25 km',
    price: 599,
    description: 'Short errands, meetings, and city hops.',
    inclusions: ['Verified driver', 'Fuel reminders', 'Live sharing'],
  },
  {
    id: 'halfday',
    title: 'Half Day',
    duration: '6 hours / 75 km',
    price: 1299,
    description: 'Shopping, events, family visits, and flexible stops.',
    inclusions: ['Multi-stop routing', 'Driver replacement', 'Priority support'],
    recommended: true,
  },
  {
    id: 'outstation',
    title: 'Outstation Driver',
    duration: '12 hours / 250 km',
    price: 2399,
    description: 'Highway-ready driver for your own car.',
    inclusions: ['Night travel ready', 'Toll log', 'Return planning'],
  },
]

export const user: User = {
  id: 'u1',
  name: 'Riya Shah',
  phone: '+91 90000 44421',
  tier: 'Velora Black',
  rating: 4.91,
  savedPlaces: [places[0], places[2], places[3]],
}

export const payments: PaymentMethod[] = [
  {
    id: 'upi',
    label: 'UPI',
    detail: 'riya@okhdfcbank',
    default: true,
  },
  {
    id: 'wallet',
    label: 'Velora Wallet',
    detail: 'Instant refunds enabled',
    default: false,
    balance: 1260,
  },
  {
    id: 'card',
    label: 'Corporate card',
    detail: 'Visa ending 8821',
    default: false,
  },
]

export const activeRide: Ride = {
  id: 'VL-8042',
  pickup: places[0],
  drop: places[2],
  status: 'driver_assigned',
  vehicleId: 'sedan',
  driverId: 'd1',
  fare: 315,
  etaMinutes: 6,
  otp: '4821',
  distanceKm: 8.6,
  timeline: [
    { label: 'Ride confirmed', time: '10:34 AM', state: 'done' },
    { label: 'Driver assigned', time: '10:35 AM', state: 'active' },
    { label: 'Pickup', time: '10:41 AM', state: 'next' },
    { label: 'Drop', time: '11:02 AM', state: 'next' },
  ],
}

export const metrics: AdminMetric[] = [
  { id: 'm1', label: 'Live rides', value: '1,486', delta: '+14.2%', tone: 'good' },
  { id: 'm2', label: 'Drivers online', value: '9,126', delta: '+7.1%', tone: 'good' },
  { id: 'm3', label: 'Revenue today', value: 'Rs. 48.6L', delta: '+10.4%', tone: 'good' },
  { id: 'm4', label: 'Open disputes', value: '42', delta: '-3', tone: 'warn' },
]

export const tickets: SupportTicket[] = [
  {
    id: 'T-8124',
    subject: 'Fare mismatch after airport toll',
    requester: 'Ankit Mehra',
    priority: 'High',
    status: 'Assigned',
    age: '14 min',
  },
  {
    id: 'T-8118',
    subject: 'Driver document recheck',
    requester: 'Ops queue',
    priority: 'Medium',
    status: 'Open',
    age: '32 min',
  },
  {
    id: 'T-8101',
    subject: 'Wallet refund pending',
    requester: 'Sara Thomas',
    priority: 'Low',
    status: 'Waiting',
    age: '1 hr',
  },
]

export const bookings: AdminBooking[] = [
  {
    id: 'VL-8042',
    rider: 'Riya Shah',
    driver: 'Aarav Mehta',
    route: 'BKC to Lower Parel',
    vehicle: 'Sedan',
    fare: 315,
    status: 'Driver assigned',
    risk: 'Low',
  },
  {
    id: 'VL-8031',
    rider: 'Karan Patel',
    driver: 'Nisha Rao',
    route: 'Andheri West to Airport T2',
    vehicle: 'Bike',
    fare: 128,
    status: 'Arriving',
    risk: 'Watch',
  },
  {
    id: 'VL-8017',
    rider: 'Meera Iyer',
    driver: 'Imran Shaikh',
    route: 'Powai to Colaba',
    vehicle: 'SUV',
    fare: 1380,
    status: 'In progress',
    risk: 'Low',
  },
  {
    id: 'VL-8009',
    rider: 'Dev Nair',
    driver: 'Unassigned',
    route: 'Dadar to Bandra',
    vehicle: 'Auto',
    fare: 218,
    status: 'Matching',
    risk: 'High',
  },
]

export const driverShift: DriverShift = {
  online: true,
  earnings: 4120,
  trips: 14,
  acceptanceRate: 94,
  rating: 4.9,
  incentiveProgress: 72,
}

export const applications: PlatformApplication[] = [
  {
    id: 'APP-201',
    role: 'driver',
    name: 'Nisha Rao',
    email: 'nisha.driver@velora.test',
    phone: '+91 99880 11223',
    vehicle: 'TVS iQube - MH 04 EV 9120',
    license: 'MH-DRV-44291',
    status: 'approved',
    submittedAt: 'Today 09:10',
    note: 'EV bike driver cleared for Bandra and Andheri zones.',
  },
  {
    id: 'APP-202',
    role: 'driver',
    name: 'Sahil Khan',
    email: 'sahil.driver@velora.test',
    phone: '+91 98700 66118',
    vehicle: 'Honda Activa - MH 02 AX 7612',
    license: 'MH-DRV-78120',
    status: 'pending',
    submittedAt: 'Today 10:22',
    note: 'Waiting for police verification upload.',
  },
  {
    id: 'APP-203',
    role: 'rider',
    name: 'Aanya Desai',
    email: 'aanya.rider@velora.test',
    phone: '+91 90044 78120',
    status: 'hold',
    submittedAt: 'Yesterday 18:40',
    note: 'Payment profile needs review.',
  },
]

export const pickupRequests: PickupRequest[] = [
  {
    id: 'REQ-610',
    riderName: 'Riya Shah',
    pickup: places[0],
    drop: places[2],
    vehicleId: 'sedan',
    fare: 315,
    distanceKm: 8.6,
    etaMinutes: 6,
    status: 'searching',
    createdAt: 'Now',
  },
  {
    id: 'REQ-611',
    riderName: 'Karan Patel',
    pickup: places[3],
    drop: places[1],
    vehicleId: 'bike',
    fare: 128,
    distanceKm: 7.2,
    etaMinutes: 4,
    status: 'accepted',
    driverId: 'd2',
    createdAt: '4 min ago',
  },
]

const fallbackSnapshot: VeloraSnapshot = {
  dataSource: {
    source: 'fallback',
    city: defaultCity,
    label: isSupabaseConfigured ? 'Supabase fallback' : 'Local fallback',
  },
  user,
  vehicles: vehicleOptions,
  drivers,
  activeRide,
  hirePackages,
  payments,
  metrics,
  tickets,
  driverShift,
  bookings,
  applications,
  pickupRequests,
}

const delay = async () => new Promise((resolve) => globalThis.setTimeout(resolve, 180))

function hasRows<T>(value: T[] | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0
}

function snapshotFromPartial(
  partial: Partial<VeloraSnapshot> | null,
  source: 'supabase' | 'fallback',
  error?: string,
): VeloraSnapshot {
  const data = partial ?? {}
  const mergedUser = {
    ...fallbackSnapshot.user,
    ...data.user,
    savedPlaces: hasRows(data.user?.savedPlaces) ? data.user.savedPlaces : fallbackSnapshot.user.savedPlaces,
  }

  return {
    ...fallbackSnapshot,
    ...data,
    dataSource: {
      source,
      city: defaultCity,
      label: source === 'supabase' ? 'Supabase live' : isSupabaseConfigured ? 'Supabase fallback' : 'Local fallback',
      error,
    },
    user: mergedUser,
    vehicles: hasRows(data.vehicles) ? data.vehicles : fallbackSnapshot.vehicles,
    drivers: hasRows(data.drivers) ? data.drivers : fallbackSnapshot.drivers,
    activeRide: data.activeRide ?? fallbackSnapshot.activeRide,
    hirePackages: hasRows(data.hirePackages) ? data.hirePackages : fallbackSnapshot.hirePackages,
    payments: hasRows(data.payments) ? data.payments : fallbackSnapshot.payments,
    metrics: hasRows(data.metrics) ? data.metrics : fallbackSnapshot.metrics,
    tickets: hasRows(data.tickets) ? data.tickets : fallbackSnapshot.tickets,
    driverShift: data.driverShift ?? fallbackSnapshot.driverShift,
    bookings: hasRows(data.bookings) ? data.bookings : fallbackSnapshot.bookings,
    applications: hasRows(data.applications) ? data.applications : fallbackSnapshot.applications,
    pickupRequests: hasRows(data.pickupRequests) ? data.pickupRequests : fallbackSnapshot.pickupRequests,
  }
}

async function fetchSnapshotFromSupabase(): Promise<VeloraSnapshot | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('velora_snapshots')
    .select('data')
    .eq('id', 'mumbai-default')
    .maybeSingle()

  if (error) {
    return snapshotFromPartial(null, 'fallback', error.message)
  }

  const row = data as { data?: Partial<VeloraSnapshot> } | null

  if (!row?.data) {
    return snapshotFromPartial(null, 'fallback', 'No mumbai-default snapshot row found')
  }

  const merged = snapshotFromPartial(row.data, 'supabase')
  const [remoteApplications, remotePickupRequests] = await Promise.all([
    fetchPlatformApplications(),
    fetchPickupRequests(),
  ])

  return {
    ...merged,
    applications: hasRows(remoteApplications) ? remoteApplications : merged.applications,
    pickupRequests: hasRows(remotePickupRequests) ? remotePickupRequests : merged.pickupRequests,
  }
}

export async function getVeloraSnapshot(): Promise<VeloraSnapshot> {
  await delay()

  const remoteSnapshot = await fetchSnapshotFromSupabase()
  return remoteSnapshot ?? snapshotFromPartial(null, 'fallback', 'Supabase is not configured')
}

export async function estimateRide(vehicleId: string): Promise<VehicleOption | undefined> {
  const snapshot = await getVeloraSnapshot()
  return snapshot.vehicles.find((vehicle) => vehicle.id === vehicleId)
}

export async function bookMockRide(vehicleId: string): Promise<Ride> {
  await delay()
  const snapshot = await getVeloraSnapshot()
  const vehicle = snapshot.vehicles.find((option) => option.id === vehicleId) ?? snapshot.vehicles[0]

  const ride: Ride = {
    ...snapshot.activeRide,
    vehicleId: vehicle.id,
    fare: vehicle.fare,
    etaMinutes: vehicle.etaMinutes,
    status: 'matching',
    timeline: [
      { label: 'Ride confirmed', time: 'Now', state: 'active' },
      { label: 'Driver assigned', time: `${vehicle.etaMinutes} min`, state: 'next' },
      { label: 'Pickup', time: `${vehicle.etaMinutes + 4} min`, state: 'next' },
      { label: 'Drop', time: `${vehicle.etaMinutes + 25} min`, state: 'next' },
    ],
  }

  if (supabase) {
    await supabase.from('velora_ride_requests').insert({
      city: defaultCity,
      vehicle_id: vehicle.id,
      ride,
    })
  }

  return ride
}

function rowToApplication(row: Record<string, unknown>): PlatformApplication {
  return {
    id: String(row.id),
    role: row.role as PlatformApplication['role'],
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone),
    vehicle: row.vehicle ? String(row.vehicle) : undefined,
    license: row.license ? String(row.license) : undefined,
    status: row.status as PlatformApplication['status'],
    submittedAt: row.created_at
      ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(row.created_at)))
      : 'Just now',
    note: String(row.note ?? ''),
  }
}

function rowToPickupRequest(row: Record<string, unknown>): PickupRequest {
  return {
    id: String(row.id),
    riderName: String(row.rider_name),
    pickup: row.pickup as Place,
    drop: row.dropoff as Place,
    vehicleId: String(row.vehicle_id),
    fare: Number(row.fare),
    distanceKm: Number(row.distance_km),
    etaMinutes: Number(row.eta_minutes),
    status: row.status as PickupRequest['status'],
    driverId: row.driver_id ? String(row.driver_id) : undefined,
    createdAt: row.created_at
      ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(String(row.created_at)))
      : 'Now',
  }
}

async function fetchPlatformApplications(): Promise<PlatformApplication[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('velora_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as Record<string, unknown>[]).map(rowToApplication)
}

async function fetchPickupRequests(): Promise<PickupRequest[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('velora_pickup_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as Record<string, unknown>[]).map(rowToPickupRequest)
}

export async function createPlatformApplication(
  input: ApplicationInput,
  userId?: string,
): Promise<PlatformApplication> {
  await delay()

  const application: PlatformApplication = {
    id: newTextId('APP'),
    role: input.role,
    name: input.name,
    email: input.email,
    phone: input.phone,
    vehicle: input.vehicle,
    license: input.license,
    status: 'pending',
    submittedAt: `Today ${nowLabel()}`,
    note:
      input.role === 'driver'
        ? 'Driver application submitted for admin verification.'
        : 'Rider profile submitted for safety and payment verification.',
  }

  if (!supabase) {
    return application
  }

  const { data, error } = await supabase
    .from('velora_applications')
    .insert({
      id: application.id,
      role: application.role,
      name: application.name,
      email: application.email,
      phone: application.phone,
      vehicle: application.vehicle,
      license: application.license,
      status: application.status,
      note: application.note,
      user_id: userId,
    })
    .select('*')
    .single()

  return data && !error ? rowToApplication(data as Record<string, unknown>) : application
}

export async function updatePlatformApplicationStatus(
  id: string,
  status: PlatformApplication['status'],
): Promise<void> {
  if (!supabase) {
    return
  }

  const note =
    status === 'approved'
      ? 'Approved by admin. Account can now use the selected workflow.'
      : status === 'hold'
        ? 'Put on hold. Admin needs one more document or verification step.'
        : status === 'denied'
          ? 'Denied by admin. Applicant must contact support or reapply.'
          : 'Application is waiting for admin review.'

  await supabase
    .from('velora_applications')
    .update({ status, note, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function createPickupRequest(input: PickupRequestInput, userId?: string): Promise<PickupRequest> {
  await delay()

  const request: PickupRequest = {
    ...input,
    createdAt: 'Now',
  }

  if (!supabase) {
    return request
  }

  const { data, error } = await supabase
    .from('velora_pickup_requests')
    .insert({
      id: request.id,
      rider_name: request.riderName,
      rider_user_id: userId,
      pickup: request.pickup,
      dropoff: request.drop,
      vehicle_id: request.vehicleId,
      fare: request.fare,
      distance_km: request.distanceKm,
      eta_minutes: request.etaMinutes,
      status: request.status,
      driver_id: request.driverId,
    })
    .select('*')
    .single()

  return data && !error ? rowToPickupRequest(data as Record<string, unknown>) : request
}

export async function updatePickupRequestStatus(
  id: string,
  status: PickupRequest['status'],
  driverId?: string,
): Promise<void> {
  if (!supabase) {
    return
  }

  await supabase
    .from('velora_pickup_requests')
    .update({ status, driver_id: driverId, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export function createLocalPickupRequest(ride: Ride, riderName: string): PickupRequest {
  return {
    id: newTextId('REQ'),
    riderName,
    pickup: ride.pickup,
    drop: ride.drop,
    vehicleId: ride.vehicleId,
    fare: ride.fare,
    distanceKm: ride.distanceKm,
    etaMinutes: ride.etaMinutes,
    status: 'searching',
    createdAt: 'Now',
  }
}
