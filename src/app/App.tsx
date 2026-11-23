import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { Boxes, CircleUserRound, Cpu, House, Plus, ShieldCheck, WifiOff, X } from 'lucide-react'
import { defaultDriver } from '../features/setup'
import { db, initialPreferences } from '../storage/db'
import type { Folder, Preferences, Setup } from '../storage/db'
import { Create } from '../components/Create'
import { Garage, SetupDetail } from '../components/Garage'
import { Engineer } from '../components/Engineer'
import { Profile } from '../components/Profile'
import { Brand, Home, Ignition } from '../components/shared'

const navigation = [
  { id: 'home', title: 'Home', short: 'Home', Icon: House },
  { id: 'create', title: 'Create Setup', short: 'Create', Icon: Plus },
  { id: 'garage', title: 'My Garage', short: 'Garage', Icon: Boxes },
  { id: 'engineer', title: 'AI Engineer', short: 'Engineer', Icon: Cpu },
  { id: 'profile', title: 'Profile', short: 'Profile', Icon: CircleUserRound },
] as const

type Page = typeof navigation[number]['id']
type Data = { setups: Setup[]; folders: Folder[]; preferences: Preferences }

function getRoute() {
  const [tab, item] = location.hash.slice(1).split('/')
  const page = navigation.find((entry) => entry.id === tab)?.id ?? 'home'
  return { page, setupId: page === 'garage' ? item ?? '' : '' }
}

function go(page: Page, setupId?: string) {
  location.hash = setupId ? `${page}/${setupId}` : page
}

export default function App() {
  const [route, setRoute] = useState(getRoute)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [active, setActive] = useState('')
  const [toast, setToast] = useState('')
  const [network, setNetwork] = useState(navigator.onLine)
  const [offlineReady, setOfflineReady] = useState(!!navigator.serviceWorker?.controller)
  const [ignition, setIgnition] = useState<'full' | 'brief' | 'pending' | 'closed'>('pending')

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [setups, folders, preferences] = await Promise.all([
        db.setups.orderBy('updated').reverse().toArray(), db.folders.toArray(), db.preferences.get('local'),
      ])
      return { setups, folders, preferences: preferences ?? initialPreferences }
    }).subscribe({ next: setData, error: () => setError(true) })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onRoute = () => { setRoute(getRoute()); window.scrollTo(0, 0) }
    const onNetwork = () => setNetwork(navigator.onLine)
    const onCache = () => setOfflineReady(!!navigator.serviceWorker?.controller)
    window.addEventListener('hashchange', onRoute)
    window.addEventListener('online', onNetwork)
    window.addEventListener('offline', onNetwork)
    navigator.serviceWorker?.addEventListener('controllerchange', onCache)
    return () => {
      window.removeEventListener('hashchange', onRoute)
      window.removeEventListener('online', onNetwork)
      window.removeEventListener('offline', onNetwork)
      navigator.serviceWorker?.removeEventListener('controllerchange', onCache)
    }
  }, [])

  const wantsIgnition = data?.preferences.ignition
  useEffect(() => {
    if (ignition !== 'pending' || wantsIgnition === undefined) return
    let animation: 'full' | 'brief' | 'closed' = 'closed'
    if (wantsIgnition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        animation = localStorage.getItem('hellafast-ignition') ? 'brief' : 'full'
        localStorage.setItem('hellafast-ignition', '1')
      } catch { animation = 'closed' }
    }
    const timer = window.setTimeout(() => setIgnition(animation), 0)
    return () => window.clearTimeout(timer)
  }, [ignition, wantsIgnition])

  useEffect(() => {
    if (ignition === 'pending' || ignition === 'closed') return
    const timer = window.setTimeout(() => setIgnition('closed'), ignition === 'full' ? 1800 : 480)
    return () => window.clearTimeout(timer)
  }, [ignition])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 6500)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (error) return <div className="boot"><Brand/><p role="alert">The browser could not open local storage. Check Safari storage settings or try again.</p><button className="button primary" onClick={() => location.reload()}>Retry</button></div>
  if (!data || ignition === 'pending') return <div className="boot"><Brand/><p role="status">Opening local garage…</p></div>
  if (ignition !== 'closed') return <Ignition brief={ignition === 'brief'} close={() => setIgnition('closed')}/>

  const { setups, folders, preferences } = data
  const open = (id: string) => go('garage', id)
  const create = () => go('create')
  const detail = setups.find((item) => item.id === route.setupId)
  const page = route.page
  const profileConfigured = Object.keys(defaultDriver).some((key) => preferences.driver[key as keyof typeof defaultDriver] !== 3)

  return <div className="layout">
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault()
      document.getElementById('main-content')?.focus()
    }}>Skip to content</a>
    <aside className="sidebar">
      <a className="brand-link" href="#home" aria-label="HELLAFAST home"><Brand/></a>
      <nav className="navigation" aria-label="Main navigation">{navigation.map(({ id, title, short, Icon }) =>
        <a href={`#${id}`} key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined}>
          <Icon size={19} strokeWidth={1.8}/><span className="desktop-label">{title}</span><span className="mobile-label">{short}</span>
        </a>,
      )}</nav>
      <div className="sidebar-foot">
        <div><span className="status-light"/><span><strong>ENGINE ONLINE</strong><small>Local rules · Ready</small></span></div>
        <p><ShieldCheck size={15}/> Data stays on-device</p>
      </div>
    </aside>
    <header className="mobile-header"><a className="brand-link" href="#home" aria-label="HELLAFAST home"><Brand/></a><span className="eyebrow"><span className="status-light"/> LOCAL</span></header>
    <main id="main-content" tabIndex={-1} className="main-content">
      {!network && <div className="network-note"><WifiOff size={16}/> Offline · Local engineering and garage are available</div>}
      {page === 'home' && <Home setups={setups} profileConfigured={profileConfigured} create={create} open={open} garage={() => go('garage')} profile={() => go('profile')}/>}
      {page === 'create' && <Create preferences={preferences} onSaved={open} report={setToast}/>}
      {page === 'garage' && (detail
        ? <SetupDetail key={detail.id} setup={detail} folders={folders} close={() => go('garage')} open={open} engineer={() => { setActive(detail.id); go('engineer') }} report={setToast}/>
        : <Garage setups={setups} folders={folders} open={open} create={create} report={setToast}/>)}
      {page === 'engineer' && <Engineer setups={setups} activeId={active} setActiveId={setActive} open={open} create={create} report={setToast}/>}
      {page === 'profile' && <Profile preferences={preferences} offlineReady={offlineReady} report={setToast}/>}
    </main>
    {toast && <div className="toast" role="status"><span>{toast}</span><button className="button ghost icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={18}/></button></div>}
  </div>
}
