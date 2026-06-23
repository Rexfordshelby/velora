import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import type { Session } from '@supabase/supabase-js'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bike,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock,
  CreditCard,
  Gauge,
  Headphones,
  Home,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LocateFixed,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Package,
  PanelLeft,
  Percent,
  Phone,
  Power,
  Radio,
  Route,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import {
  bookMockRide,
  createLocalPickupRequest,
  createPickupRequest,
  createPlatformApplication,
  estimateRide,
  getVeloraSnapshot,
  places,
  updatePickupRequestStatus,
  updatePlatformApplicationStatus,
  vehicleOptions,
} from './mockApi'
import { adminEmail, supabase } from './supabaseClient'
import type {
  AdminBooking,
  DataSourceState,
  Driver,
  DriverHirePackage,
  LatLng,
  PaymentMethod,
  PickupRequest,
  PlatformApplication,
  Ride,
  Surface,
  VehicleOption,
  VeloraSnapshot,
} from './types'

type RiderMode = 'ride' | 'driver'
type RiderPanel = 'book' | 'track' | 'activity' | 'wallet' | 'profile'
type AdminView = 'approvals' | 'dispatch' | 'ops'
type ApplicationDraft = {
  name: string
  email: string
  phone: string
  vehicle?: string
  license?: string
}

const money = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
  style: 'currency',
  currency: 'INR',
})

const routeLine: LatLng[] = [
  { lat: 19.0656, lng: 72.8625 },
  { lat: 19.0502, lng: 72.8401 },
  { lat: 19.0187, lng: 72.8179 },
  { lat: 18.9947, lng: 72.8258 },
]

const airportLine: LatLng[] = [
  { lat: 19.0656, lng: 72.8625 },
  { lat: 19.0736, lng: 72.8676 },
  { lat: 19.0811, lng: 72.8721 },
  { lat: 19.0896, lng: 72.8656 },
]

const pickupIcon = L.divIcon({
  className: '',
  html: '<span class="velora-pin"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const dropIcon = L.divIcon({
  className: '',
  html: '<span class="velora-pin drop"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const driverIcon = L.divIcon({
  className: '',
  html: '<span class="velora-pin driver"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const vehicleIconMap = {
  Bike,
  Auto: Radio,
  Mini: Car,
  Sedan: Car,
  SUV: Car,
  XL: Users,
  EV: Zap,
  Parcel: Package,
  Rentals: CalendarClock,
  Outstation: Route,
  'Driver Hire': KeyRound,
}

const MobilityScene = lazy(() => import('./MobilityScene'))

function App() {
  const [snapshot, setSnapshot] = useState<VeloraSnapshot | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [surface, setSurface] = useState<Surface>('rider')
  const [riderPanel, setRiderPanel] = useState<RiderPanel>('book')
  const [selectedVehicleId, setSelectedVehicleId] = useState('sedan')
  const [selectedHireId, setSelectedHireId] = useState('halfday')
  const [activeRide, setActiveRide] = useState<Ride | null>(null)
  const [applications, setApplications] = useState<PlatformApplication[]>([])
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([])
  const [bookingState, setBookingState] = useState<'idle' | 'matching' | 'tracking'>('idle')
  const [isDriverOnline, setIsDriverOnline] = useState(true)
  const [compactMenuOpen, setCompactMenuOpen] = useState(false)

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    getVeloraSnapshot().then((data) => {
      setSnapshot(data)
      setActiveRide(data.activeRide)
      setApplications(data.applications)
      setPickupRequests(data.pickupRequests)
      setIsDriverOnline(data.driverShift.online)
    })
  }, [])

  useEffect(() => {
    estimateRide(selectedVehicleId)
  }, [selectedVehicleId])

  const authEmail = session?.user.email ?? ''
  const isAdmin = authEmail.toLowerCase() === adminEmail
  const activeSurface: Surface = !isAdmin && surface.startsWith('admin') ? 'rider' : surface

  const selectedVehicle = useMemo(
    () => snapshot?.vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicleOptions[3],
    [selectedVehicleId, snapshot],
  )

  const activeDriver = useMemo(
    () => snapshot?.drivers.find((driver) => driver.id === activeRide?.driverId) ?? snapshot?.drivers[0],
    [activeRide, snapshot],
  )

  const selectedHire = useMemo(
    () => snapshot?.hirePackages.find((item) => item.id === selectedHireId),
    [selectedHireId, snapshot],
  )

  const handleBookRide = async () => {
    setBookingState('matching')
    setRiderPanel('track')
    const ride = await bookMockRide(selectedVehicleId)
    const nextRequest = createLocalPickupRequest(ride, snapshot?.user.name ?? 'Velora rider')
    const savedRequest = await createPickupRequest(nextRequest, session?.user.id)

    setActiveRide(ride)
    setPickupRequests((current) => [savedRequest, ...current])

    window.setTimeout(() => {
      setActiveRide((current) =>
        current
          ? {
              ...current,
              status: 'driver_assigned',
              timeline: activeRide?.timeline ?? current.timeline,
            }
          : current,
      )
      setBookingState('tracking')
    }, 850)
  }

  const handleSignOut = async () => {
    await supabase?.auth.signOut()
    setSurface('rider')
    setRiderPanel('book')
    setBookingState('idle')
  }

  const handleApplicationSubmit = async (role: 'rider' | 'driver', draft?: ApplicationDraft) => {
    const nextApplication = await createPlatformApplication(
      {
        role,
        name: draft?.name || (role === 'driver' ? 'New Mumbai Driver' : snapshot?.user.name ?? 'New Velora Rider'),
        email: draft?.email || authEmail || `${role}@velora.test`,
        phone: draft?.phone || snapshot?.user.phone || '+91 90000 00000',
        vehicle: role === 'driver' ? draft?.vehicle || 'Bike / Auto / Cab details pending' : draft?.vehicle,
        license: role === 'driver' ? draft?.license || 'Upload after admin pre-check' : draft?.license,
      },
      session?.user.id,
    )

    setApplications((current) => [nextApplication, ...current])
    setSurface(role === 'driver' ? 'driver-apply' : 'activity')
  }

  const handleApplicationDecision = async (id: string, status: PlatformApplication['status']) => {
    await updatePlatformApplicationStatus(id, status)
    setApplications((current) =>
      current.map((application) =>
        application.id === id
          ? {
              ...application,
              status,
              note:
                status === 'approved'
                  ? 'Approved by admin. Account can now use the selected workflow.'
                  : status === 'hold'
                    ? 'Put on hold. Admin needs one more document or verification step.'
                    : status === 'denied'
                      ? 'Denied by admin. Applicant must contact support or reapply.'
                      : application.note,
            }
          : application,
      ),
    )
  }

  const handleAcceptPickup = async (requestId: string) => {
    const driver = snapshot?.drivers[1]
    await updatePickupRequestStatus(requestId, 'accepted', driver?.id ?? 'd2')

    setPickupRequests((current) =>
      current.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: 'accepted',
              driverId: driver?.id ?? 'd2',
              etaMinutes: Math.max(2, request.etaMinutes - 2),
            }
          : request,
      ),
    )
  }

  const handleArrivePickup = async (requestId: string) => {
    const driver = snapshot?.drivers[1]
    await updatePickupRequestStatus(requestId, 'arriving', driver?.id ?? 'd2')
    setPickupRequests((current) =>
      current.map((request) => (request.id === requestId ? { ...request, status: 'arriving', etaMinutes: 1 } : request)),
    )
  }

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!session && supabase) {
    return <LoginScreen />
  }

  if (!snapshot) {
    return <LoadingScreen />
  }

  return (
    <main className="ridego-skin min-h-screen overflow-hidden bg-[#f6f4ee] pb-20 text-[#111816] lg:pb-0">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <NavigationRail
          active={activeSurface}
          isAdmin={isAdmin}
          onChange={(next) => {
            setSurface(next)
            setCompactMenuOpen(false)
          }}
          compactOpen={compactMenuOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            authEmail={authEmail}
            dataSource={snapshot.dataSource}
            isAdmin={isAdmin}
            surface={activeSurface}
            userName={isAdmin ? 'Raashif Shaikh' : snapshot.user.name}
            onMenu={() => setCompactMenuOpen((value) => !value)}
            onSignOut={handleSignOut}
          />

          {activeSurface === 'rider' && (
            <RiderExperience
              activeDriver={activeDriver}
              activeRide={activeRide}
              bookingState={bookingState}
              panel={riderPanel}
              payments={snapshot.payments}
              selectedVehicle={selectedVehicle}
              selectedVehicleId={selectedVehicleId}
              setPanel={setRiderPanel}
              setSelectedVehicleId={setSelectedVehicleId}
              userPlaces={snapshot.user.savedPlaces}
              vehicles={snapshot.vehicles}
              onBookRide={handleBookRide}
              onCancelRide={() => {
                setBookingState('idle')
                setRiderPanel('book')
                setActiveRide(snapshot.activeRide)
              }}
            />
          )}

          {activeSurface === 'activity' && (
            <AccountPage
              applications={applications}
              payments={snapshot.payments}
              userName={snapshot.user.name}
              onSubmitApplication={handleApplicationSubmit}
            />
          )}

          {activeSurface === 'wallet' && (
            <UtilityPage
              accent="Wallet"
              description="Payment methods, wallet balance, ride passes, and refunds."
              icon={Wallet}
              title="Payments and wallet"
            >
              <WalletPanel payments={snapshot.payments} />
            </UtilityPage>
          )}

          {activeSurface === 'hire' && (
            <DriverHirePage
              activeDriver={activeDriver}
              hirePackages={snapshot.hirePackages}
              payments={snapshot.payments}
              selectedHire={selectedHire}
              selectedHireId={selectedHireId}
              onSelectHire={setSelectedHireId}
            />
          )}

          {activeSurface === 'driver-apply' && (
            <DriverApplicationPage authEmail={authEmail} applications={applications} onSubmit={handleApplicationSubmit} />
          )}

          {activeSurface === 'driver' && (
            <DriverExperience
              drivers={snapshot.drivers}
              isOnline={isDriverOnline}
              pickupRequests={pickupRequests}
              shift={snapshot.driverShift}
              onAcceptPickup={handleAcceptPickup}
              onArrivePickup={handleArrivePickup}
              onToggleOnline={() => setIsDriverOnline((value) => !value)}
            />
          )}

          {activeSurface.startsWith('admin') && isAdmin && (
            <AdminExperience
              view={
                activeSurface === 'admin-approvals'
                  ? 'approvals'
                  : activeSurface === 'admin-dispatch'
                    ? 'dispatch'
                    : 'ops'
              }
              applications={applications}
              bookings={snapshot.bookings}
              drivers={snapshot.drivers}
              metrics={snapshot.metrics}
              pickupRequests={pickupRequests}
              tickets={snapshot.tickets}
              vehicles={snapshot.vehicles}
              onApplicationDecision={handleApplicationDecision}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0b1411] p-6 text-white">
      <div className="grid gap-5 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-[#f6c94c] text-[#0b1411]">
          <Navigation className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">Velora</p>
          <h1 className="mt-2 text-3xl font-semibold">Loading mobility desk</h1>
        </div>
      </div>
    </main>
  )
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const isAdminEmail = email.trim().toLowerCase() === adminEmail

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    if (!supabase) {
      setMessage('Supabase is not configured for this build.')
      return
    }

    if (mode === 'signup' && isAdminEmail) {
      setMessage('Admin accounts must be created from Supabase Auth, then signed in here.')
      return
    }

    setBusy(true)
    const credentials = { email: email.trim(), password }
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)
    setBusy(false)

    if (error) {
      setMessage(error.message)
      return
    }

    if (mode === 'signup') {
      setMessage('Account created. Check email confirmation if Supabase requires it, then sign in.')
      setMode('login')
      return
    }

    setMessage('Welcome to Velora.')
  }

  return (
    <main className="ridego-auth relative min-h-screen overflow-hidden bg-[#07110f] text-white">
      <div className="absolute inset-0">
        <Suspense fallback={<div className="h-full w-full bg-[#07110f]" />}>
          <MobilityScene variant="hero" />
        </Suspense>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(246,201,76,0.20),transparent_34%),linear-gradient(135deg,rgba(7,17,15,0.60),rgba(7,17,15,0.94)_62%)]" />

      <section className="relative z-10 grid min-h-screen content-between gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center lg:content-center lg:gap-12 lg:p-10">
        <div className="max-w-3xl pt-4 lg:pt-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f6c94c] backdrop-blur">
            <Navigation className="h-4 w-4" />
            Velora Mumbai
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-7xl">
            Premium rides, drivers, and ops in one control room.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/68 sm:text-lg">
            One secure login for riders, drivers, and operators. Admin tools appear only after the approved admin email signs in.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ['9.1k', 'drivers online'],
              ['6 min', 'sedan pickup'],
              ['24/7', 'safety desk'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-white/12 bg-white/10 p-3 backdrop-blur">
                <p className="text-xl font-bold text-[#f6c94c]">{value}</p>
                <p className="mt-1 text-xs text-white/55">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleAuth}
          className="rounded-lg border border-white/12 bg-white/94 p-4 text-[#111816] shadow-2xl backdrop-blur sm:p-5"
        >
          <div className="flex rounded-lg bg-[#ece8dc] p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={clsx('h-11 flex-1 rounded-md transition', mode === 'login' && 'bg-white shadow-sm')}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={clsx('h-11 flex-1 rounded-md transition', mode === 'signup' && 'bg-white shadow-sm')}
            >
              Create rider
            </button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f766e]">Secure access</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {mode === 'login' ? 'Login to Velora' : 'Create rider account'}
            </h2>
            <p className="mt-2 text-sm text-black/55">
              Admin navigation unlocks only for {adminEmail}.
            </p>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-13 w-full rounded-lg border border-black/10 bg-[#fbfaf6] px-4 text-base font-semibold outline-none transition focus:border-[#0f766e] focus:bg-white"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">Password</span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="mt-2 h-13 w-full rounded-lg border border-black/10 bg-[#fbfaf6] px-4 text-base font-semibold outline-none transition focus:border-[#0f766e] focus:bg-white"
            />
          </label>

          {message && (
            <div className="mt-4 rounded-lg border border-[#f59e0b]/25 bg-[#fff7db] px-3 py-2 text-sm font-semibold text-[#8a4b00]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white shadow-xl shadow-black/15 transition hover:bg-[#0f766e] disabled:bg-black/40"
          >
            {busy ? 'Checking access' : mode === 'login' ? 'Continue' : 'Create account'}
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-[#f3f1ea] p-3">
              <ShieldCheck className="h-4 w-4 text-[#0f766e]" />
              <p className="mt-2 font-bold">RLS protected</p>
            </div>
            <div className="rounded-lg bg-[#f3f1ea] p-3">
              <KeyRound className="h-4 w-4 text-[#0f766e]" />
              <p className="mt-2 font-bold">Admin gated</p>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

function NavigationRail({
  active,
  compactOpen,
  isAdmin,
  onChange,
}: {
  active: Surface
  compactOpen: boolean
  isAdmin: boolean
  onChange: (surface: Surface) => void
}) {
  const items = [
    { id: 'rider' as const, label: 'Ride', icon: Home },
    { id: 'hire' as const, label: 'Hire', icon: KeyRound },
    { id: 'activity' as const, label: 'Trips', icon: Activity },
    { id: 'wallet' as const, label: 'Wallet', icon: Wallet },
    { id: 'driver-apply' as const, label: 'Apply', icon: ClipboardCheck },
    { id: 'driver' as const, label: 'Drive', icon: Gauge },
    ...(isAdmin
      ? [
          { id: 'admin-approvals' as const, label: 'Review', icon: ShieldCheck },
          { id: 'admin-dispatch' as const, label: 'Dispatch', icon: Radio },
          { id: 'admin-ops' as const, label: 'Ops', icon: LayoutDashboard },
        ]
      : []),
  ]

  return (
    <>
      <aside
        className={clsx(
          'fixed inset-x-3 top-18 z-[900] rounded-lg border border-white/20 bg-[#0b1411]/95 p-3 text-white shadow-2xl backdrop-blur lg:static lg:z-auto lg:flex lg:min-h-screen lg:w-24 lg:flex-col lg:rounded-none lg:border-0 lg:p-4',
          compactOpen ? 'block' : 'hidden lg:flex',
        )}
      >
        <div className="hidden items-center justify-center lg:flex">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#f6c94c] text-[#0b1411]">
            <Navigation className="h-6 w-6" />
          </div>
        </div>

        <nav className="app-scrollbar grid max-h-[calc(100vh-8rem)] grid-cols-3 gap-2 overflow-auto lg:mt-10 lg:grid-cols-1">
          {items.map((item) => {
            const Icon = item.icon
            const selected = active === item.id

            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => onChange(item.id)}
                className={clsx(
                  'grid h-16 place-items-center rounded-lg border text-xs font-semibold transition',
                  selected
                    ? 'border-[#f6c94c] bg-[#f6c94c] text-[#0b1411]'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto hidden gap-2 lg:grid">
          <button
            type="button"
            title="Settings"
            className="grid h-12 w-full place-items-center rounded-lg bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Support"
            className="grid h-12 w-full place-items-center rounded-lg bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Headphones className="h-5 w-5" />
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-[850] grid grid-cols-5 gap-1 rounded-lg border border-white/40 bg-[#0b1411]/94 p-2 text-white shadow-2xl backdrop-blur lg:hidden">
        {items.slice(0, 5).map((item) => {
          const Icon = item.icon
          const selected = active === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={clsx(
                'grid h-14 place-items-center rounded-md text-xs font-bold transition',
                selected ? 'bg-[#f6c94c] text-[#0b1411]' : 'text-white/68',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

function TopBar({
  authEmail,
  dataSource,
  isAdmin,
  surface,
  userName,
  onMenu,
  onSignOut,
}: {
  authEmail: string
  dataSource: DataSourceState
  isAdmin: boolean
  surface: Surface
  userName: string
  onMenu: () => void
  onSignOut: () => void
}) {
  const title = {
    rider: 'Book a ride',
    activity: 'Trips and profile',
    wallet: 'Wallet',
    hire: 'Hire a driver',
    'driver-apply': 'Become a driver',
    driver: 'Driver work',
    'admin-approvals': 'Admin approvals',
    'admin-dispatch': 'Live dispatch',
    'admin-ops': 'Operations',
  }[surface]

  return (
    <header className="z-[800] flex h-18 items-center justify-between gap-3 border-b border-black/10 bg-[#f6f4ee]/88 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          title="Open menu"
          onClick={onMenu}
          className="grid h-11 w-11 place-items-center rounded-lg bg-white text-[#111816] shadow-sm lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#0b1411] text-[#f6c94c] lg:hidden">
          <Navigation className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0f766e]">Velora</p>
          <h1 className="truncate text-xl font-semibold text-[#111816] lg:text-2xl">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Locate"
          className="hidden h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold shadow-sm md:inline-flex"
        >
          <LocateFixed className="h-4 w-4 text-[#0f766e]" />
          {dataSource.city}
        </button>
        <span
          title={dataSource.error ?? dataSource.label}
          className={clsx(
            'hidden h-11 items-center rounded-lg border px-3 text-xs font-bold shadow-sm sm:inline-flex',
            dataSource.source === 'supabase'
              ? 'border-[#0f766e]/20 bg-[#eef8f5] text-[#0f766e]'
              : 'border-[#b45309]/20 bg-[#fff7db] text-[#b45309]',
          )}
        >
          {dataSource.label}
        </span>
        <button
          type="button"
          title="Notifications"
          className="grid h-11 w-11 place-items-center rounded-lg border border-black/10 bg-white shadow-sm"
        >
          <Sparkles className="h-5 w-5 text-[#f59e0b]" />
        </button>
        {isAdmin && (
          <span className="hidden h-11 items-center gap-2 rounded-lg border border-[#f6c94c]/40 bg-[#fff7db] px-3 text-xs font-bold text-[#8a4b00] md:inline-flex">
            <ShieldCheck className="h-4 w-4" />
            Admin
          </span>
        )}
        <div className="hidden items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm sm:flex">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#111816] text-sm font-bold text-white">
            {userName.charAt(0)}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{userName}</p>
            <p className="max-w-40 truncate text-xs text-black/50">{authEmail || 'Velora Black'}</p>
          </div>
        </div>
        <button
          type="button"
          title="Sign out"
          onClick={onSignOut}
          className="grid h-11 w-11 place-items-center rounded-lg border border-black/10 bg-white shadow-sm transition hover:border-[#9f1239] hover:text-[#9f1239]"
        >
          <Power className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}

function RiderExperience({
  activeDriver,
  activeRide,
  bookingState,
  panel,
  payments,
  selectedVehicle,
  selectedVehicleId,
  setPanel,
  setSelectedVehicleId,
  userPlaces,
  vehicles,
  onBookRide,
  onCancelRide,
}: {
  activeDriver?: Driver
  activeRide: Ride | null
  bookingState: 'idle' | 'matching' | 'tracking'
  panel: RiderPanel
  payments: PaymentMethod[]
  selectedVehicle: VehicleOption
  selectedVehicleId: string
  setPanel: (panel: RiderPanel) => void
  setSelectedVehicleId: (id: string) => void
  userPlaces: typeof places
  vehicles: VehicleOption[]
  onBookRide: () => void
  onCancelRide: () => void
}) {
  return (
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-rows-[auto_minmax(28rem,1fr)] lg:grid-cols-[25rem_minmax(30rem,1fr)_22rem] lg:grid-rows-1">
      <div className="z-[600] border-b border-black/10 bg-[#f6f4ee] p-4 lg:border-b-0 lg:border-r lg:p-5">
        <div className="rounded-lg bg-[#111816] p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f6c94c]">Mumbai first</p>
          <h2 className="mt-2 text-2xl font-semibold">Where are you going?</h2>
          <p className="mt-1 text-sm text-white/58">Fast pickup requests for Bike, Auto, Cabs, EV, Parcel, Rentals, and Outstation.</p>
        </div>

        <div className="mt-4 grid gap-3">
          <SearchBox icon={MapPin} label="Pickup" value="Bandra Kurla Complex" detail="Gate 2, BKC" />
          <SearchBox icon={Search} label="Drop" value="Phoenix Palladium" detail="Lower Parel" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {userPlaces.map((place) => (
            <button
              key={place.id}
              type="button"
              className="h-16 rounded-lg border border-black/10 bg-white p-2 text-left text-xs shadow-sm transition hover:border-[#0f766e]"
            >
              <span className="font-semibold text-[#111816]">{place.tag}</span>
              <span className="mt-1 block truncate text-black/50">{place.label}</span>
            </button>
          ))}
        </div>

        <RideBookingPanel
          bookingState={bookingState}
          selectedVehicle={selectedVehicle}
          selectedVehicleId={selectedVehicleId}
          vehicles={vehicles}
          onBookRide={onBookRide}
          onSelectVehicle={setSelectedVehicleId}
        />
      </div>

      <div className="relative min-h-[32rem] overflow-hidden bg-[#dfe7df] lg:min-h-0">
        <VeloraMap activeDriver={activeDriver} activeRide={activeRide} mode="ride" />
        <div className="pointer-events-none absolute right-0 top-12 z-[450] hidden h-72 w-72 opacity-95 mix-blend-multiply md:block">
          <Suspense fallback={null}>
            <MobilityScene />
          </Suspense>
        </div>
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex flex-wrap gap-2">
          <MapChip icon={ShieldCheck} label="Safety line armed" />
          <MapChip icon={Clock} label={`${selectedVehicle.etaMinutes} min pickup`} />
          <MapChip icon={IndianRupee} label={money.format(selectedVehicle.fare)} />
        </div>

        <div className="absolute inset-x-4 bottom-4 z-[500] rounded-lg border border-white/60 bg-white/92 p-3 shadow-2xl backdrop-blur lg:hidden">
          {panel === 'track' ? (
            <TripStatusCard
              activeDriver={activeDriver}
              activeRide={activeRide}
              bookingState={bookingState}
              onCancelRide={onCancelRide}
            />
          ) : (
            <CompactFareCard
              mode="ride"
              selectedVehicle={selectedVehicle}
              onBookRide={onBookRide}
            />
          )}
        </div>
      </div>

      <aside className="hidden border-l border-black/10 bg-[#fbfaf6] p-5 lg:block">
        <div className="flex gap-2 rounded-lg bg-[#ece8dc] p-1 text-xs font-semibold">
          {[
            { id: 'book', label: 'Book', icon: Send },
            { id: 'track', label: 'Track', icon: Navigation },
          ].map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setPanel(item.id as RiderPanel)}
                className={clsx(
                  'grid h-12 flex-1 place-items-center rounded-md transition',
                  panel === item.id ? 'bg-white text-[#111816] shadow-sm' : 'text-black/50',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="app-scrollbar mt-4 max-h-[calc(100vh-10.5rem)] overflow-auto pr-1">
          {panel === 'book' && (
            <FareSummary
              mode="ride"
              payments={payments}
              selectedVehicle={selectedVehicle}
              onBookRide={onBookRide}
            />
          )}
          {panel === 'track' && (
            <TripStatusCard
              activeDriver={activeDriver}
              activeRide={activeRide}
              bookingState={bookingState}
              onCancelRide={onCancelRide}
            />
          )}
        </div>
      </aside>
    </section>
  )
}

function UtilityPage({
  accent,
  children,
  description,
  icon: Icon,
  title,
}: {
  accent: string
  children: ReactNode
  description: string
  icon: typeof Wallet
  title: string
}) {
  return (
    <section className="app-scrollbar min-h-[calc(100vh-4.5rem)] overflow-auto p-4 lg:p-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-lg bg-[#111816] p-5 text-white shadow-2xl">
          <div className="grid h-13 w-13 place-items-center rounded-lg bg-[#f6c94c] text-[#111816]">
            <Icon className="h-6 w-6" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#f6c94c]">{accent}</p>
          <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/62">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}

function AccountPage({
  applications,
  payments,
  userName,
  onSubmitApplication,
}: {
  applications: PlatformApplication[]
  payments: PaymentMethod[]
  userName: string
  onSubmitApplication: (role: 'rider' | 'driver') => void
}) {
  return (
    <section className="app-scrollbar min-h-[calc(100vh-4.5rem)] overflow-auto p-4 lg:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-4">
          <div className="rounded-lg bg-[#111816] p-5 text-white shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f6c94c]">Rider account</p>
            <h2 className="mt-2 text-3xl font-semibold">{userName}</h2>
            <p className="mt-2 max-w-2xl text-white/60">Trip history, saved profile, rider verification, support, and scheduled rides live here.</p>
          </div>
          <ActivityPanel />
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Scheduled rides</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ['Airport run', 'Tomorrow, 07:30', 'BKC to CSMIA T2'],
                ['Office return', 'Friday, 18:45', 'Lower Parel to Bandra'],
                ['Family visit', 'Sunday, 10:00', 'Juhu to Powai'],
              ].map(([titleText, time, route]) => (
                <div key={titleText} className="rounded-lg bg-[#f6f4ee] p-4">
                  <CalendarClock className="h-5 w-5 text-[#0f766e]" />
                  <p className="mt-3 font-bold">{titleText}</p>
                  <p className="mt-1 text-sm text-black/50">{time}</p>
                  <p className="mt-2 text-xs font-semibold text-black/45">{route}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="grid gap-4">
          <ProfilePanel applications={applications} onSubmitApplication={onSubmitApplication} />
          <WalletPanel payments={payments.slice(0, 2)} />
        </aside>
      </div>
    </section>
  )
}

function DriverHirePage({
  activeDriver,
  hirePackages,
  payments,
  selectedHire,
  selectedHireId,
  onSelectHire,
}: {
  activeDriver?: Driver
  hirePackages: DriverHirePackage[]
  payments: PaymentMethod[]
  selectedHire?: DriverHirePackage
  selectedHireId: string
  onSelectHire: (id: string) => void
}) {
  return (
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-rows-[auto_minmax(28rem,1fr)] lg:grid-cols-[27rem_minmax(0,1fr)_21rem] lg:grid-rows-1">
      <div className="z-[600] border-b border-black/10 bg-[#f6f4ee] p-4 lg:border-b-0 lg:border-r lg:p-5">
        <div className="rounded-lg bg-[#111816] p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f6c94c]">For your own car</p>
          <h2 className="mt-2 text-2xl font-semibold">Book a verified driver</h2>
          <p className="mt-1 text-sm text-white/58">Hourly, half-day, outstation, formal driver preferences, and safety checks.</p>
        </div>
        <div className="mt-4 grid gap-3">
          <SearchBox icon={MapPin} label="Driver reports at" value="Bandra Kurla Complex" detail="Gate 2, BKC, Mumbai" />
          <SearchBox icon={Car} label="Your vehicle" value="Hyundai Creta" detail="Manual / Petrol / MH registered" />
        </div>
        <DriverHirePanel
          packages={hirePackages}
          selectedHire={selectedHire}
          selectedHireId={selectedHireId}
          onSelect={onSelectHire}
        />
      </div>
      <div className="relative min-h-[32rem] overflow-hidden bg-[#dfe7df] lg:min-h-0">
        <VeloraMap activeDriver={activeDriver} activeRide={null} mode="driver" />
        <div className="pointer-events-none absolute right-0 top-12 z-[450] hidden h-72 w-72 opacity-95 mix-blend-multiply md:block">
          <Suspense fallback={null}>
            <MobilityScene />
          </Suspense>
        </div>
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex flex-wrap gap-2">
          <MapChip icon={ShieldCheck} label="Background checked" />
          <MapChip icon={Clock} label="10 min reporting" />
          <MapChip icon={IndianRupee} label={money.format(selectedHire?.price ?? 599)} />
        </div>
      </div>
      <aside className="hidden border-l border-black/10 bg-[#fbfaf6] p-5 lg:block">
        <FareSummary
          mode="driver"
          payments={payments}
          selectedHire={selectedHire}
          selectedVehicle={vehicleOptions[10]}
          onBookRide={() => undefined}
        />
      </aside>
    </section>
  )
}

function DriverApplicationPage({
  applications,
  authEmail,
  onSubmit,
}: {
  applications: PlatformApplication[]
  authEmail: string
  onSubmit: (role: 'rider' | 'driver', draft?: ApplicationDraft) => void
}) {
  const [draft, setDraft] = useState<ApplicationDraft>({
    name: 'New Mumbai Driver',
    email: authEmail,
    phone: '+91 90000 00000',
    vehicle: 'Bike / Auto / Cab',
    license: 'MH driving license',
  })
  const driverApplications = applications.filter((application) => application.role === 'driver')

  return (
    <section className="app-scrollbar min-h-[calc(100vh-4.5rem)] overflow-auto p-4 lg:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit('driver', draft)
          }}
          className="grid gap-4 rounded-lg border border-black/10 bg-white p-5 shadow-sm"
        >
          <div className="rounded-lg bg-[#111816] p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f6c94c]">Driver onboarding</p>
            <h2 className="mt-2 text-3xl font-semibold">Apply to drive with Velora</h2>
            <p className="mt-2 max-w-2xl text-white/60">Submit your profile once. Admin reviews documents, then approved drivers can receive nearby pickup requests.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Full name', 'name'],
              ['Email', 'email'],
              ['Phone', 'phone'],
              ['Vehicle details', 'vehicle'],
              ['License details', 'license'],
            ].map(([label, key]) => (
              <label key={key} className={clsx('grid gap-2', key === 'license' && 'md:col-span-2')}>
                <span className="text-sm font-bold">{label}</span>
                <input
                  value={String(draft[key as keyof ApplicationDraft] ?? '')}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                  className="h-12 rounded-lg border border-black/10 bg-[#f6f4ee] px-3 text-sm font-semibold outline-none focus:border-[#0f766e]"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {['Police verification', 'Vehicle RC / insurance', 'Bank payout details'].map((item) => (
              <div key={item} className="rounded-lg bg-[#f6f4ee] p-4">
                <ClipboardCheck className="h-5 w-5 text-[#0f766e]" />
                <p className="mt-3 text-sm font-bold">{item}</p>
                <p className="mt-1 text-xs text-black/45">Admin will verify before activation.</p>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="flex h-13 items-center justify-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white shadow-xl shadow-black/10 transition hover:bg-[#0f766e]"
          >
            <Send className="h-5 w-5" />
            Submit driver application
          </button>
        </form>

        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Application status</h2>
            <div className="mt-4 grid gap-3">
              {driverApplications.map((application) => (
                <div key={application.id} className="rounded-lg bg-[#f6f4ee] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{application.name}</p>
                    <StatusBadge status={application.status} />
                  </div>
                  <p className="mt-2 text-sm text-black/50">{application.note}</p>
                  <p className="mt-2 text-xs font-semibold text-black/45">{application.submittedAt}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Activation flow</h2>
            <div className="mt-4 grid gap-3">
              {['Apply', 'Admin review', 'On hold / approved', 'Go online and accept trips'].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg bg-[#f6f4ee] p-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#111816] text-xs font-bold text-[#f6c94c]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function SearchBox({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string
  icon: typeof Search
  label: string
  value: string
}) {
  return (
    <label className="flex min-h-16 items-center gap-3 rounded-lg border border-black/10 bg-white px-3 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f0f7f5] text-[#0f766e]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{label}</span>
        <input
          value={value}
          readOnly
          className="block w-full truncate border-0 bg-transparent p-0 text-sm font-semibold text-[#111816] outline-none"
        />
        <span className="block truncate text-xs text-black/45">{detail}</span>
      </span>
    </label>
  )
}

function RideBookingPanel({
  bookingState,
  selectedVehicle,
  selectedVehicleId,
  vehicles,
  onBookRide,
  onSelectVehicle,
}: {
  bookingState: 'idle' | 'matching' | 'tracking'
  selectedVehicle: VehicleOption
  selectedVehicleId: string
  vehicles: VehicleOption[]
  onBookRide: () => void
  onSelectVehicle: (id: string) => void
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Choose vehicle</h2>
          <p className="text-sm text-black/50">Live fares for Mumbai</p>
        </div>
        <button
          type="button"
          title="Filters"
          className="grid h-10 w-10 place-items-center rounded-lg border border-black/10 bg-white"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="app-scrollbar mt-3 grid max-h-[42vh] gap-2 overflow-auto pr-1 lg:max-h-[calc(100vh-29rem)]">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            selected={selectedVehicleId === vehicle.id}
            vehicle={vehicle}
            onSelect={() => onSelectVehicle(vehicle.id)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={bookingState === 'matching'}
        onClick={onBookRide}
        className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white shadow-xl shadow-black/10 transition hover:bg-[#0f766e] disabled:bg-black/40"
      >
        {bookingState === 'matching' ? (
          <>
            <Radio className="h-5 w-5 animate-pulse" />
            Matching driver
          </>
        ) : (
          <>
            <Send className="h-5 w-5" />
            Confirm {selectedVehicle.kind} for {money.format(selectedVehicle.fare)}
          </>
        )}
      </button>
    </div>
  )
}

function VehicleCard({
  selected,
  vehicle,
  onSelect,
}: {
  selected: boolean
  vehicle: VehicleOption
  onSelect: () => void
}) {
  const Icon = vehicleIconMap[vehicle.kind]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'grid min-h-20 grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg border p-3 text-left transition',
        selected
          ? 'border-[#0f766e] bg-[#eef8f5] shadow-sm'
          : 'border-black/10 bg-white hover:border-black/25',
      )}
    >
      <span
        className={clsx(
          'grid h-12 w-12 place-items-center rounded-lg',
          selected ? 'bg-[#0f766e] text-white' : 'bg-[#f3f1ea] text-[#111816]',
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-semibold">{vehicle.kind}</span>
          {vehicle.badge && (
            <span className="rounded-md bg-[#f6c94c] px-2 py-0.5 text-[0.68rem] font-bold text-[#111816]">
              {vehicle.badge}
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-sm text-black/50">
          {vehicle.description} · {vehicle.etaMinutes} min · {vehicle.seats || 'Door'} seats
        </span>
        {(vehicle.carbon || vehicle.surge) && (
          <span className="mt-1 block text-xs font-semibold text-[#0f766e]">
            {vehicle.carbon ?? vehicle.surge}
          </span>
        )}
      </span>
      <span className="text-right">
        <span className="block font-bold">{money.format(vehicle.fare)}</span>
        {vehicle.previousFare && (
          <span className="text-xs text-black/40 line-through">{money.format(vehicle.previousFare)}</span>
        )}
      </span>
    </button>
  )
}

function DriverHirePanel({
  packages,
  selectedHire,
  selectedHireId,
  onSelect,
}: {
  packages: DriverHirePackage[]
  selectedHire?: DriverHirePackage
  selectedHireId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="mt-5">
      <div>
        <h2 className="text-lg font-semibold">Book a driver</h2>
        <p className="text-sm text-black/50">For your car, today or scheduled</p>
      </div>

      <div className="mt-3 grid gap-2">
        {packages.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={clsx(
              'rounded-lg border p-3 text-left transition',
              selectedHireId === item.id
                ? 'border-[#0f766e] bg-[#eef8f5]'
                : 'border-black/10 bg-white hover:border-black/25',
            )}
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  {item.title}
                  {item.recommended && (
                    <span className="rounded-md bg-[#f6c94c] px-2 py-0.5 text-[0.68rem] font-bold">
                      Popular
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-sm text-black/50">{item.duration}</span>
              </span>
              <span className="font-bold">{money.format(item.price)}</span>
            </span>
            <span className="mt-2 block text-sm text-black/60">{item.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4 text-[#0f766e]" />
          Driver preferences
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {['Manual car', 'Hindi/English', 'Highway ready', 'Formal dress'].map((item) => (
            <span key={item} className="rounded-lg bg-[#f3f1ea] px-3 py-2 font-medium text-black/70">
              {item}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white shadow-xl shadow-black/10 transition hover:bg-[#0f766e]"
      >
        <KeyRound className="h-5 w-5" />
        Reserve {selectedHire?.title ?? 'driver'}
      </button>
    </div>
  )
}

function VeloraMap({
  activeDriver,
  activeRide,
  mode,
}: {
  activeDriver?: Driver
  activeRide: Ride | null
  mode: RiderMode
}) {
  const line = mode === 'driver' ? airportLine : routeLine
  const pickup = activeRide?.pickup.coordinate ?? places[0].coordinate
  const drop = mode === 'driver' ? places[1].coordinate : activeRide?.drop.coordinate ?? places[2].coordinate
  const driverPoint = { lat: 12.989, lng: 77.632 }

  return (
    <MapContainer
      center={[19.045, 72.855]}
      zoom={12}
      scrollWheelZoom
      className="z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline
        pathOptions={{ color: '#111816', weight: 7, opacity: 0.22, lineCap: 'round' }}
        positions={line.map((point) => [point.lat, point.lng])}
      />
      <Polyline
        pathOptions={{ color: '#0f766e', weight: 4, opacity: 0.9, lineCap: 'round' }}
        positions={line.map((point) => [point.lat, point.lng])}
      />
      <Marker icon={pickupIcon} position={[pickup.lat, pickup.lng]}>
        <Popup>Pickup - Bandra Kurla Complex</Popup>
      </Marker>
      <Marker icon={dropIcon} position={[drop.lat, drop.lng]}>
        <Popup>{mode === 'driver' ? 'Airport T2 drop' : 'Drop - Phoenix Palladium'}</Popup>
      </Marker>
      <Marker icon={driverIcon} position={[driverPoint.lat, driverPoint.lng]}>
        <Popup>{activeDriver?.name ?? 'Velora driver'} · nearby</Popup>
      </Marker>
    </MapContainer>
  )
}

function MapChip({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <span className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-lg border border-white/60 bg-white/90 px-3 text-xs font-bold text-[#111816] shadow-xl backdrop-blur">
      <Icon className="h-4 w-4 text-[#0f766e]" />
      {label}
    </span>
  )
}

function CompactFareCard({
  mode,
  selectedHire,
  selectedVehicle,
  onBookRide,
}: {
  mode: RiderMode
  selectedHire?: DriverHirePackage
  selectedVehicle: VehicleOption
  onBookRide: () => void
}) {
  const title = mode === 'driver' ? selectedHire?.title : selectedVehicle.kind
  const price = mode === 'driver' ? selectedHire?.price : selectedVehicle.fare

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="text-xs text-black/50">
          {mode === 'driver' ? selectedHire?.duration : `${selectedVehicle.etaMinutes} min pickup`}
        </p>
      </div>
      <button
        type="button"
        onClick={onBookRide}
        className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white"
      >
        <Send className="h-4 w-4" />
        {money.format(price ?? 0)}
      </button>
    </div>
  )
}

function FareSummary({
  mode,
  payments,
  selectedHire,
  selectedVehicle,
  onBookRide,
}: {
  mode: RiderMode
  payments: PaymentMethod[]
  selectedHire?: DriverHirePackage
  selectedVehicle: VehicleOption
  onBookRide: () => void
}) {
  const defaultPayment = payments.find((payment) => payment.default) ?? payments[0]
  const base = mode === 'driver' ? selectedHire?.price ?? 0 : selectedVehicle.fare
  const total = base - 35

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fare preview</h2>
          <span className="rounded-md bg-[#eef8f5] px-2 py-1 text-xs font-bold text-[#0f766e]">Locked</span>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <FareRow label="Base fare" value={money.format(base)} />
          <FareRow label="Velora Plus coupon" value="- Rs. 35" accent />
          <FareRow label="Platform fee" value="Rs. 0" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
          <span className="font-semibold">Payable</span>
          <span className="text-2xl font-bold">{money.format(total)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#f3f1ea]">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{defaultPayment.label}</p>
              <p className="text-xs text-black/50">{defaultPayment.detail}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-black/35" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SafetyTile icon={ShieldCheck} title="SOS" detail="24/7 safety desk" />
        <SafetyTile icon={Percent} title="VLORA35" detail="Applied coupon" />
      </div>

      <PlatformFlowCard />

      <button
        type="button"
        onClick={onBookRide}
        className="flex h-13 items-center justify-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white shadow-xl shadow-black/10 transition hover:bg-[#0f766e]"
      >
        <Send className="h-5 w-5" />
        Confirm booking
      </button>
    </div>
  )
}

function PlatformFlowCard() {
  const steps = [
    ['1', 'Apply', 'User applies as rider or driver from the shared app login.'],
    ['2', 'Admin review', 'Admin approves, denies, or holds the application.'],
    ['3', 'Pickup request', 'Approved rider creates a pickup/drop request.'],
    ['4', 'Driver accepts', 'Nearby approved driver accepts, arrives, and starts the ride.'],
  ]

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Route className="h-5 w-5 text-[#0f766e]" />
        <h2 className="text-lg font-semibold">Velora flow</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {steps.map(([number, title, detail]) => (
          <div key={title} className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#111816] text-xs font-bold text-[#f6c94c]">
              {number}
            </span>
            <span>
              <span className="block text-sm font-bold">{title}</span>
              <span className="text-xs text-black/50">{detail}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FareRow({ accent, label, value }: { accent?: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-black/55">{label}</span>
      <span className={clsx('font-semibold', accent && 'text-[#0f766e]')}>{value}</span>
    </div>
  )
}

function SafetyTile({
  detail,
  icon: Icon,
  title,
}: {
  detail: string
  icon: typeof ShieldCheck
  title: string
}) {
  return (
    <button
      type="button"
      className="min-h-24 rounded-lg border border-black/10 bg-white p-3 text-left shadow-sm transition hover:border-[#0f766e]"
    >
      <Icon className="h-5 w-5 text-[#0f766e]" />
      <span className="mt-3 block text-sm font-bold">{title}</span>
      <span className="text-xs text-black/50">{detail}</span>
    </button>
  )
}

function TripStatusCard({
  activeDriver,
  activeRide,
  bookingState,
  onCancelRide,
}: {
  activeDriver?: Driver
  activeRide: Ride | null
  bookingState: 'idle' | 'matching' | 'tracking'
  onCancelRide: () => void
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
              {bookingState === 'matching' ? 'Matching' : 'Driver assigned'}
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {bookingState === 'matching' ? 'Finding the best driver' : `${activeRide?.etaMinutes ?? 6} min away`}
            </h2>
          </div>
          <span className="rounded-lg bg-[#111816] px-3 py-2 text-sm font-bold text-white">
            OTP {activeRide?.otp ?? '4821'}
          </span>
        </div>

        {activeDriver && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#f3f1ea] p-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-lg font-bold text-white"
              style={{ background: activeDriver.avatarColor }}
            >
              {activeDriver.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{activeDriver.name}</p>
              <p className="truncate text-sm text-black/50">
                {activeDriver.vehicle} · {activeDriver.plate}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#0f766e]">
                <Star className="h-3.5 w-3.5 fill-[#0f766e]" />
                {activeDriver.rating} · {activeDriver.trips.toLocaleString('en-IN')} trips
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <IconButton icon={Phone} label="Call" />
          <IconButton icon={MessageCircle} label="Chat" />
          <IconButton icon={ShieldCheck} label="SOS" />
        </div>
      </div>

      <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold">Trip timeline</h3>
        <div className="mt-4 grid gap-3">
          {(activeRide?.timeline ?? []).map((item) => (
            <div key={item.label} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3">
              <span
                className={clsx(
                  'grid h-6 w-6 place-items-center rounded-full border',
                  item.state === 'done' && 'border-[#0f766e] bg-[#0f766e] text-white',
                  item.state === 'active' && 'border-[#f59e0b] bg-[#fff7db] text-[#b45309]',
                  item.state === 'next' && 'border-black/10 bg-[#f3f1ea] text-black/35',
                )}
              >
                {item.state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="text-xs text-black/45">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onCancelRide}
        className="h-12 rounded-lg border border-black/10 bg-white text-sm font-bold text-[#9f1239] shadow-sm"
      >
        Cancel ride
      </button>
    </div>
  )
}

function IconButton({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  return (
    <button
      type="button"
      title={label}
      className="grid h-16 place-items-center rounded-lg border border-black/10 bg-white text-sm font-bold transition hover:border-[#0f766e]"
    >
      <Icon className="h-5 w-5 text-[#0f766e]" />
      <span>{label}</span>
    </button>
  )
}

function WalletPanel({ payments }: { payments: PaymentMethod[] }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg bg-[#111816] p-4 text-white">
        <p className="text-sm text-white/60">Velora Wallet</p>
        <p className="mt-2 text-3xl font-bold">Rs. 1,260</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="h-11 rounded-lg bg-[#f6c94c] text-sm font-bold text-[#111816]">
            Add money
          </button>
          <button type="button" className="h-11 rounded-lg bg-white/10 text-sm font-bold">
            Passes
          </button>
        </div>
      </div>
      {payments.map((payment) => (
        <div key={payment.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{payment.label}</p>
              <p className="text-sm text-black/50">{payment.detail}</p>
            </div>
            {payment.default && <BadgeCheck className="h-5 w-5 text-[#0f766e]" />}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: PlatformApplication['status'] | PickupRequest['status'] }) {
  return (
    <span
      className={clsx(
        'rounded-md px-2 py-1 text-xs font-bold capitalize',
        (status === 'approved' || status === 'accepted' || status === 'arriving' || status === 'completed') &&
          'bg-[#eef8f5] text-[#0f766e]',
        (status === 'pending' || status === 'searching' || status === 'hold') && 'bg-[#fff7db] text-[#b45309]',
        (status === 'denied' || status === 'cancelled') && 'bg-[#ffe8e8] text-[#9f1239]',
      )}
    >
      {status}
    </span>
  )
}

function ProfilePanel({
  applications,
  onSubmitApplication,
}: {
  applications: PlatformApplication[]
  onSubmitApplication: (role: 'rider' | 'driver') => void
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-[#111816] text-xl font-bold text-white">R</div>
          <div>
            <h2 className="text-lg font-semibold">Riya Sharma</h2>
            <p className="text-sm text-black/50">4.91 rating · Velora Black</p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-[#0f766e]" />
          <h2 className="text-lg font-semibold">Role application</h2>
        </div>
        <p className="mt-1 text-sm text-black/50">Submit as rider or driver. Admin can approve, deny, or hold.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSubmitApplication('rider')}
            className="h-11 rounded-lg bg-[#eef8f5] text-sm font-bold text-[#0f766e]"
          >
            Become rider
          </button>
          <button
            type="button"
            onClick={() => onSubmitApplication('driver')}
            className="h-11 rounded-lg bg-[#111816] text-sm font-bold text-white"
          >
            Become driver
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {applications.slice(0, 3).map((application) => (
            <div key={application.id} className="rounded-lg bg-[#f6f4ee] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{application.role === 'driver' ? 'Driver' : 'Rider'} application</p>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-1 text-xs text-black/50">{application.note}</p>
            </div>
          ))}
        </div>
      </div>
      {[
        { label: 'Scheduled rides', icon: CalendarClock },
        { label: 'Support tickets', icon: LifeBuoy },
        { label: 'Family safety', icon: ShieldCheck },
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          className="flex h-14 items-center justify-between rounded-lg border border-black/10 bg-white px-4 text-sm font-bold shadow-sm"
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-5 w-5 text-[#0f766e]" />
            {item.label}
          </span>
          <ChevronRight className="h-5 w-5 text-black/35" />
        </button>
      ))}
    </div>
  )
}

function ActivityPanel() {
  return (
    <div className="grid gap-3">
      {[
        ['Today', 'BKC to Lower Parel', 'Rs. 315'],
        ['Yesterday', 'Andheri West to Airport T2', 'Rs. 196'],
        ['Mon', 'Driver hire - Half Day', 'Rs. 1,299'],
      ].map(([date, route, fare]) => (
        <div key={route} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{date}</p>
          <p className="mt-2 font-bold">{route}</p>
          <p className="mt-1 text-sm text-black/50">{fare}</p>
        </div>
      ))}
    </div>
  )
}

function DriverExperience({
  drivers,
  isOnline,
  pickupRequests,
  shift,
  onAcceptPickup,
  onArrivePickup,
  onToggleOnline,
}: {
  drivers: Driver[]
  isOnline: boolean
  pickupRequests: PickupRequest[]
  shift: VeloraSnapshot['driverShift']
  onAcceptPickup: (requestId: string) => void
  onArrivePickup: (requestId: string) => void
  onToggleOnline: () => void
}) {
  const primary = drivers[1]
  const activeRequests = pickupRequests.filter((request) => request.status === 'searching' || request.driverId === primary.id)
  const featuredRequest = activeRequests[0]

  return (
    <section className="app-scrollbar min-h-[calc(100vh-4.5rem)] overflow-auto p-4 lg:p-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg bg-[#111816] p-5 text-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f6c94c]">Driver mode</p>
              <h2 className="mt-2 text-3xl font-semibold">Good morning, Nisha</h2>
              <p className="mt-2 max-w-xl text-white/60">
                {isOnline ? 'You are receiving premium city requests.' : 'Go online to receive nearby trips.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleOnline}
              className={clsx(
                'flex h-13 items-center gap-2 rounded-lg px-4 text-sm font-bold',
                isOnline ? 'bg-[#f6c94c] text-[#111816]' : 'bg-white/10 text-white',
              )}
            >
              <Power className="h-5 w-5" />
              {isOnline ? 'Online' : 'Offline'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <DriverStat label="Earnings" value={money.format(shift.earnings)} icon={CircleDollarSign} />
            <DriverStat label="Trips" value={`${shift.trips}`} icon={Route} />
            <DriverStat label="Accept" value={`${shift.acceptanceRate}%`} icon={CheckCircle2} />
            <DriverStat label="Rating" value={`${shift.rating}`} icon={Star} />
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Incoming request</h2>
              <p className="text-sm text-black/50">
                {featuredRequest ? `${featuredRequest.pickup.label} to ${featuredRequest.drop.label}` : 'No open request'}
              </p>
            </div>
            <span className="rounded-lg bg-[#fff7db] px-3 py-2 text-sm font-bold text-[#b45309]">
              {featuredRequest ? featuredRequest.createdAt : 'Standby'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 rounded-lg bg-[#f6f4ee] p-4">
            <RoutePoint label="Pickup" value={featuredRequest?.pickup.label ?? 'Waiting for rider'} />
            <RoutePoint label="Drop" value={featuredRequest?.drop.label ?? 'Go online to receive trips'} />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Distance" value={`${featuredRequest?.distanceKm ?? 0} km`} />
            <MiniMetric label="Fare" value={money.format(featuredRequest?.fare ?? 0)} />
            <MiniMetric label="ETA" value={`${featuredRequest?.etaMinutes ?? 0} min`} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="h-13 rounded-lg border border-black/10 bg-white text-sm font-bold">
              Decline
            </button>
            <button
              type="button"
              disabled={!featuredRequest}
              onClick={() =>
                featuredRequest?.status === 'accepted'
                  ? onArrivePickup(featuredRequest.id)
                  : featuredRequest && onAcceptPickup(featuredRequest.id)
              }
              className="h-13 rounded-lg bg-[#0f766e] text-sm font-bold text-white disabled:bg-black/30"
            >
              {featuredRequest?.status === 'accepted' ? 'Arrive now' : 'Accept'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Nearby rider pickup queue</h2>
            <p className="text-sm text-black/50">Drivers see open rider requests and can accept like Rapido/Uber.</p>
          </div>
          <span className="rounded-lg bg-[#eef8f5] px-3 py-2 text-sm font-bold text-[#0f766e]">
            {activeRequests.length} nearby
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeRequests.map((request) => (
            <div key={request.id} className="rounded-lg bg-[#f6f4ee] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{request.riderName}</p>
                <StatusBadge status={request.status} />
              </div>
              <p className="mt-2 text-sm font-semibold">{request.pickup.label}</p>
              <p className="text-sm text-black/50">to {request.drop.label}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniMetric label="Fare" value={money.format(request.fare)} />
                <MiniMetric label="ETA" value={`${request.etaMinutes} min`} />
                <MiniMetric label="Km" value={`${request.distanceKm}`} />
              </div>
              <button
                type="button"
                onClick={() => (request.status === 'accepted' ? onArrivePickup(request.id) : onAcceptPickup(request.id))}
                className="mt-3 h-11 w-full rounded-lg bg-[#111816] text-sm font-bold text-white"
              >
                {request.status === 'accepted' ? 'Mark arriving' : 'Accept pickup'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Trip progress</h2>
          <div className="mt-4 grid gap-3">
            {[
              ['Reached pickup zone', 'Done'],
              ['Verify rider OTP', 'Active'],
              ['Start navigation', 'Next'],
              ['Collect toll receipts', 'Next'],
            ].map(([label, state]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-[#f6f4ee] px-3 py-3">
                <span className="flex items-center gap-3 text-sm font-bold">
                  <CheckCircle2 className={clsx('h-5 w-5', state === 'Done' ? 'text-[#0f766e]' : 'text-black/25')} />
                  {label}
                </span>
                <span className="text-xs font-semibold text-black/45">{state}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Documents</h2>
            <div className="mt-4 grid gap-3">
              {['Driving license', 'Police verification', 'Vehicle insurance'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg bg-[#f6f4ee] px-3 py-3">
                  <span className="text-sm font-bold">{item}</span>
                  <BadgeCheck className="h-5 w-5 text-[#0f766e]" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Vehicle status</h2>
            <div className="mt-4 flex items-center gap-3">
              <div
                className="grid h-14 w-14 place-items-center rounded-lg text-lg font-bold text-white"
                style={{ background: primary.avatarColor }}
              >
                {primary.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold">{primary.vehicle}</p>
                <p className="text-sm text-black/50">{primary.plate}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Incentive progress</span>
                <span>{shift.incentiveProgress}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#ece8dc]">
                <div className="h-full rounded-full bg-[#f6c94c]" style={{ width: `${shift.incentiveProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DriverStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CircleDollarSign
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <Icon className="h-5 w-5 text-[#f6c94c]" />
      <p className="mt-3 text-xl font-bold">{value}</p>
      <p className="text-xs text-white/55">{label}</p>
    </div>
  )
}

function RoutePoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#0f766e]">
        <MapPin className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{label}</span>
        <span className="font-bold">{value}</span>
      </span>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f6f4ee] p-3">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-black/45">{label}</p>
    </div>
  )
}

function AdminExperience({
  view,
  applications,
  bookings,
  drivers,
  metrics,
  pickupRequests,
  tickets,
  vehicles,
  onApplicationDecision,
}: {
  view: AdminView
  applications: PlatformApplication[]
  bookings: AdminBooking[]
  drivers: Driver[]
  metrics: VeloraSnapshot['metrics']
  pickupRequests: PickupRequest[]
  tickets: VeloraSnapshot['tickets']
  vehicles: VehicleOption[]
  onApplicationDecision: (id: string, status: PlatformApplication['status']) => void
}) {
  const showApprovals = view === 'approvals'
  const showDispatch = view === 'dispatch'
  const showOps = view === 'ops'

  return (
    <section className="app-scrollbar min-h-[calc(100vh-4.5rem)] overflow-auto p-4 lg:p-6">
      <div className={clsx('grid gap-4', showOps && 'xl:grid-cols-[1fr_24rem]')}>
        <div className="grid gap-4">
          {showOps && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.id} className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-black/50">{metric.label}</p>
                      <p className="mt-2 text-2xl font-bold">{metric.value}</p>
                    </div>
                    <TrendingUp
                      className={clsx(
                        'h-5 w-5',
                        metric.tone === 'good' && 'text-[#0f766e]',
                        metric.tone === 'warn' && 'text-[#b45309]',
                        metric.tone === 'neutral' && 'text-black/40',
                      )}
                    />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#0f766e]">{metric.delta}</p>
                </div>
              ))}
            </div>
          )}

          {showDispatch && (
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Live booking board</h2>
                <p className="text-sm text-black/50">Dispatch, risk, and fare state</p>
              </div>
              <button
                type="button"
                className="flex h-11 items-center gap-2 rounded-lg bg-[#111816] px-4 text-sm font-bold text-white"
              >
                <PanelLeft className="h-4 w-4" />
                Ops view
              </button>
            </div>

            <div className="app-scrollbar mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-xs uppercase tracking-[0.14em] text-black/40">
                    <th className="py-3 pr-4">Ride</th>
                    <th className="py-3 pr-4">Rider</th>
                    <th className="py-3 pr-4">Driver</th>
                    <th className="py-3 pr-4">Route</th>
                    <th className="py-3 pr-4">Fare</th>
                    <th className="py-3 pr-4">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-black/5">
                      <td className="py-4 pr-4 font-bold">{booking.id}</td>
                      <td className="py-4 pr-4">{booking.rider}</td>
                      <td className="py-4 pr-4">{booking.driver}</td>
                      <td className="py-4 pr-4">{booking.route}</td>
                      <td className="py-4 pr-4 font-semibold">{money.format(booking.fare)}</td>
                      <td className="py-4 pr-4">
                        <span
                          className={clsx(
                            'rounded-md px-2 py-1 text-xs font-bold',
                            booking.risk === 'Low' && 'bg-[#eef8f5] text-[#0f766e]',
                            booking.risk === 'Watch' && 'bg-[#fff7db] text-[#b45309]',
                            booking.risk === 'High' && 'bg-[#ffe8e8] text-[#9f1239]',
                          )}
                        >
                          {booking.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {(showApprovals || showDispatch) && (
          <div className={clsx('grid gap-4', showApprovals && showDispatch && 'xl:grid-cols-2')}>
            {showApprovals && (
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Application approvals</h2>
                  <p className="text-sm text-black/50">Approve, deny, or hold rider and driver onboarding.</p>
                </div>
                <span className="rounded-lg bg-[#fff7db] px-3 py-2 text-sm font-bold text-[#b45309]">
                  {applications.filter((application) => application.status === 'pending').length} pending
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {applications.map((application) => (
                  <div key={application.id} className="rounded-lg bg-[#f6f4ee] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{application.name}</p>
                        <p className="text-sm text-black/50">
                          {application.role} - {application.phone}
                        </p>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-2 text-sm text-black/60">{application.note}</p>
                    {application.vehicle && <p className="mt-1 text-xs font-semibold text-black/45">{application.vehicle}</p>}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => onApplicationDecision(application.id, 'approved')}
                        className="h-10 rounded-lg bg-[#0f766e] text-xs font-bold text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplicationDecision(application.id, 'hold')}
                        className="h-10 rounded-lg bg-[#fff7db] text-xs font-bold text-[#8a4b00]"
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplicationDecision(application.id, 'denied')}
                        className="h-10 rounded-lg bg-[#ffe8e8] text-xs font-bold text-[#9f1239]"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {showDispatch && (
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Pickup dispatch</h2>
                  <p className="text-sm text-black/50">Track customer requests and nearby driver acceptance.</p>
                </div>
                <span className="rounded-lg bg-[#eef8f5] px-3 py-2 text-sm font-bold text-[#0f766e]">
                  {pickupRequests.length} live
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {pickupRequests.map((request) => (
                  <div key={request.id} className="rounded-lg bg-[#f6f4ee] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{request.id}</p>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {request.pickup.label} to {request.drop.label}
                    </p>
                    <p className="mt-1 text-xs text-black/50">
                      {request.riderName} - {money.format(request.fare)} - {request.etaMinutes} min ETA
                    </p>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
          )}

          {showOps && (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Vehicle categories</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {vehicles.slice(0, 9).map((vehicle) => {
                  const Icon = vehicleIconMap[vehicle.kind]

                  return (
                    <div key={vehicle.id} className="rounded-lg bg-[#f6f4ee] p-3">
                      <Icon className="h-5 w-5 text-[#0f766e]" />
                      <p className="mt-3 font-bold">{vehicle.kind}</p>
                      <p className="text-xs text-black/50">{vehicle.etaMinutes} min avg</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Surge zones</h2>
              <div className="mt-4 grid gap-3">
                {[
                  ['Airport T2 corridor', '1.8x', 'High demand'],
                  ['Bandra Kurla Complex', '1.2x', 'Office peak'],
                  ['Andheri West', '1.4x', 'Evening exits'],
                ].map(([zone, surge, note]) => (
                  <div key={zone} className="flex items-center justify-between rounded-lg bg-[#f6f4ee] p-3">
                    <div>
                      <p className="font-bold">{zone}</p>
                      <p className="text-sm text-black/50">{note}</p>
                    </div>
                    <span className="rounded-lg bg-[#111816] px-3 py-2 text-sm font-bold text-white">{surge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {showOps && (
        <aside className="grid gap-4">
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Driver verification</h2>
            <div className="mt-4 grid gap-3">
              {drivers.map((driver) => (
                <div key={driver.id} className="flex items-center gap-3 rounded-lg bg-[#f6f4ee] p-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-lg font-bold text-white"
                    style={{ background: driver.avatarColor }}
                  >
                    {driver.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{driver.name}</p>
                    <p className="truncate text-sm text-black/50">{driver.vehicle}</p>
                  </div>
                  <BadgeCheck className="h-5 w-5 shrink-0 text-[#0f766e]" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold">Support tickets</h2>
            <div className="mt-4 grid gap-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg bg-[#f6f4ee] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{ticket.id}</p>
                    <span
                      className={clsx(
                        'rounded-md px-2 py-1 text-xs font-bold',
                        ticket.priority === 'High' && 'bg-[#ffe8e8] text-[#9f1239]',
                        ticket.priority === 'Medium' && 'bg-[#fff7db] text-[#b45309]',
                        ticket.priority === 'Low' && 'bg-[#eef8f5] text-[#0f766e]',
                      )}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-black/50">
                    {ticket.requester} · {ticket.status} · {ticket.age}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
        )}
      </div>
    </section>
  )
}

export default App
