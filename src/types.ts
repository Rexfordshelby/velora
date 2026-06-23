export type Surface =
  | 'rider'
  | 'activity'
  | 'wallet'
  | 'hire'
  | 'driver-apply'
  | 'driver'
  | 'admin-approvals'
  | 'admin-dispatch'
  | 'admin-ops'

export type VehicleKind =
  | 'Bike'
  | 'Auto'
  | 'Mini'
  | 'Sedan'
  | 'SUV'
  | 'XL'
  | 'EV'
  | 'Parcel'
  | 'Rentals'
  | 'Outstation'
  | 'Driver Hire'

export type LatLng = {
  lat: number
  lng: number
}

export type Place = {
  id: string
  label: string
  detail: string
  coordinate: LatLng
  tag: string
}

export type VehicleOption = {
  id: string
  kind: VehicleKind
  description: string
  seats: number
  etaMinutes: number
  fare: number
  previousFare?: number
  carbon?: string
  surge?: string
  badge?: string
}

export type Driver = {
  id: string
  name: string
  avatarColor: string
  rating: number
  trips: number
  vehicle: string
  plate: string
  distance: string
  phone: string
  verified: boolean
}

export type RideStatus =
  | 'draft'
  | 'matching'
  | 'driver_assigned'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type Ride = {
  id: string
  pickup: Place
  drop: Place
  status: RideStatus
  vehicleId: string
  driverId: string
  fare: number
  etaMinutes: number
  otp: string
  distanceKm: number
  timeline: Array<{
    label: string
    time: string
    state: 'done' | 'active' | 'next'
  }>
}

export type DriverHirePackage = {
  id: string
  title: string
  duration: string
  price: number
  description: string
  inclusions: string[]
  recommended?: boolean
}

export type User = {
  id: string
  name: string
  phone: string
  tier: string
  rating: number
  savedPlaces: Place[]
}

export type PaymentMethod = {
  id: string
  label: string
  detail: string
  default: boolean
  balance?: number
}

export type AdminMetric = {
  id: string
  label: string
  value: string
  delta: string
  tone: 'good' | 'warn' | 'neutral'
}

export type SupportTicket = {
  id: string
  subject: string
  requester: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Open' | 'Assigned' | 'Waiting'
  age: string
}

export type DriverShift = {
  online: boolean
  earnings: number
  trips: number
  acceptanceRate: number
  rating: number
  incentiveProgress: number
}

export type AdminBooking = {
  id: string
  rider: string
  driver: string
  route: string
  vehicle: VehicleKind
  fare: number
  status: string
  risk: 'Low' | 'Watch' | 'High'
}

export type ApplicationStatus = 'pending' | 'approved' | 'denied' | 'hold'

export type PlatformApplication = {
  id: string
  role: 'rider' | 'driver'
  name: string
  email: string
  phone: string
  vehicle?: string
  license?: string
  status: ApplicationStatus
  submittedAt: string
  note: string
}

export type PickupRequestStatus = 'searching' | 'accepted' | 'arriving' | 'completed' | 'cancelled'

export type PickupRequest = {
  id: string
  riderName: string
  pickup: Place
  drop: Place
  vehicleId: string
  fare: number
  distanceKm: number
  etaMinutes: number
  status: PickupRequestStatus
  driverId?: string
  createdAt: string
}

export type DataSourceState = {
  source: 'supabase' | 'fallback'
  city: string
  label: string
  error?: string
}

export type VeloraSnapshot = {
  dataSource: DataSourceState
  user: User
  vehicles: VehicleOption[]
  drivers: Driver[]
  activeRide: Ride
  hirePackages: DriverHirePackage[]
  payments: PaymentMethod[]
  metrics: AdminMetric[]
  tickets: SupportTicket[]
  driverShift: DriverShift
  bookings: AdminBooking[]
  applications: PlatformApplication[]
  pickupRequests: PickupRequest[]
}
