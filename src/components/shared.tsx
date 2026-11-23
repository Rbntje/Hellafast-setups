import { ArrowDown, ArrowRight, ArrowUp, ChevronRight, CircleHelp, Flag, Plus, Radio, ShieldCheck, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { circuits, compare, formatSetting, groups, ranges } from '../features/setup'
import type { Result, Settings } from '../features/setup'
import type { Setup } from '../storage/db'

export function Mark({ className = '' }: { className?: string }) {
  return <svg className={className} width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
    <path fill="currentColor" d="M17 18h10l-3 10h12l3-10h10l-8 28H31l3-10H22l-3 10H9zM48 29h7l-2 7h-7z"/>
  </svg>
}

export function Brand() {
  return <div className="brand"><span className="brand-icon"><Mark /></span><span><b>HELLAFAST</b><small>SETUPS</small></span></div>
}

export function Ignition({ brief, close }: { brief: boolean; close: () => void }) {
  return <div className={`ignition ${brief ? 'brief' : ''}`}>
    <div className="ignition-content">
      <svg viewBox="0 0 640 160" aria-hidden="true">
        <path className="ignition-guide" d="M0 125h190l81-31 40-66h29l-19 54h67l-16 47h59l70-42h139" fill="none"/>
        <path className="ignition-trace" pathLength="100" d="M0 125h190l81-31 40-66h29l-19 54h67l-16 47h59l70-42h139" fill="none"/>
        <circle cx="271" cy="94" r="3"/><circle cx="431" cy="129" r="3"/><circle cx="501" cy="87" r="3"/>
      </svg>
      <div className="ignition-brand"><Brand /><span><ShieldCheck size={14} /> LOCAL DATA READY</span></div>
    </div>
    <button className="button ghost ignition-skip" onClick={close}>Skip ignition <ChevronRight size={16}/></button>
  </div>
}

export function PageHeading({ eyebrow, title, description, actions }: {
  eyebrow: string; title: string; description: string; actions?: ReactNode
}) {
  return <div className="page-heading">
    <div><p className="eyebrow accent"><span className="signal-square" />{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>
    {actions}
  </div>
}

export function Empty({ icon = <Flag size={22}/>, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return <div className="empty"><span className="empty-icon">{icon}</span><strong>{title}</strong>{children}</div>
}

export function SetupList({ items, open }: { items: Setup[]; open: (id: string) => void }) {
  return <div className="setup-list">{items.map((item) => {
    const track = circuits.find((row) => row.id === item.draft.circuit)
    const active = item.versions.at(-1)
    return <button key={item.id} className="setup-row" onClick={() => open(item.id)}>
      <span className="setup-row-icon"><Flag size={17}/></span>
      <span className="setup-row-title"><strong>{item.name}</strong><small>{track?.name} · {active?.weather} · V{item.versions.length}</small></span>
      {item.favorite && <Star size={15} className="accent" fill="currentColor"/>}<ChevronRight size={17}/>
    </button>
  })}</div>
}

export function SettingsTable({ values }: { values: Settings }) {
  return <div className="settings-grid">{groups.map(([group, keys]) => <section className="settings-group" key={group}>
    <h3>{group}</h3>
    <dl>{keys.map((key) => <div key={key}><dt>{ranges[key][0]}</dt><dd>{formatSetting(key, values[key])}</dd></div>)}</dl>
  </section>)}</div>
}

const differenceEffects = [
  'A larger front-to-rear wing split can favor turn-in. More rear wing can improve stability and add drag.',
  'Differential lock affects rotation off throttle and how the car puts power down on exit.',
  'Camber and toe can affect contact patch, scrub and tyre temperatures.',
  'Springs, anti-roll bars and ride height change how the platform responds to kerbs, load and direction changes.',
  'Brake bias moves braking load between axles. Pressure affects how easily a wheel locks.',
  'Pressure can alter tyre warm-up, contact patch and wear. Compare pressures over a representative stint.',
]

export function Differences({ before, after }: { before: Settings; after: Settings }) {
  const all = compare(before, after)
  const changed = all.filter((row) => row.delta)
  return <div className="comparison">
    <p className="muted">{changed.length} changed · {all.length - changed.length} unchanged</p>
    <div className="table-scroll"><table><thead><tr><th>Setting</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
      <tbody>{all.map(({ key, before: old, after: next, delta }) => <tr key={key}>
        <th scope="row">{ranges[key][0]}</th><td>{formatSetting(key, old)}</td><td>{formatSetting(key, next)}</td>
        <td className={delta ? 'accent' : 'muted'}>{delta > 0 && <ArrowUp size={12}/>} {delta < 0 && <ArrowDown size={12}/>} {delta || '—'}</td>
      </tr>)}</tbody>
    </table></div>
    {changed.length > 0 && <ul className="reasons">{groups.map(([group, keys], index) =>
      changed.some((change) => keys.includes(change.key)) && <li key={group}>{differenceEffects[index]}</li>,
    )}</ul>}
  </div>
}

export function EvidenceSummary({ result }: { result: Result }) {
  return <section className="panel evidence-panel">
    <div className="panel-header"><div><p className="eyebrow accent"><Radio size={14}/> SOURCE LOG</p><h2>Research and rationale</h2></div></div>
    <p className="muted">{result.researchNote}</p>
    <ul className="reasons">{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    {result.evidence.map((evidence) => <details key={evidence.url}>
      <summary>{evidence.name} <span>{evidence.kind}</span></summary>
      <p>{evidence.game} · Patch {evidence.patch} · {evidence.car} · {evidence.weather} · {evidence.session}</p>
      <p className="muted">{evidence.note} Accessed {evidence.accessedAt.slice(0, 10)}.</p>
      {evidence.publication && <p>Published {evidence.publication.slice(0, 10)}.</p>}
      <dl className="evidence-values">{Object.entries(evidence.values).map(([key, val]) => {
        const setting = key as keyof Settings
        return <div key={key}><dt>{ranges[setting][0]}</dt><dd>{formatSetting(setting, val)}</dd></div>
      })}</dl>
      <a href={evidence.url} target="_blank" rel="noreferrer">Open source <ArrowRight size={14}/></a>
    </details>)}
  </section>
}

export function Home({ setups, profileConfigured, create, open, garage, profile }: {
  setups: Setup[]; profileConfigured: boolean; create: () => void; open: (id: string) => void; garage: () => void; profile: () => void
}) {
  const recent = setups.filter((setup) => !setup.archived).slice(0, 4)
  const favorites = setups.filter((setup) => setup.favorite && !setup.archived).slice(0, 3)
  const withResearch = setups.find((setup) => setup.result.evidence.some((entry) => Object.keys(entry.values).length))
  return <div className="home">
    <div className="home-kicker"><p className="eyebrow"><span className="signal-square"/> RACE ENGINEERING</p><span>F1 25 <span className="separator">/</span> BASE GAME</span></div>
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-visual" aria-hidden="true" />
      <div className="hero-content">
        <p className="eyebrow accent"><span /> YOUR PERSONAL RACE ENGINEER</p>
        <h1 id="home-title">FIND YOUR<br/><em>LINE.</em></h1>
        <p>Build your setup. Chase perfection.</p>
        <button className="button primary" onClick={create}><Plus size={19}/> Create setup <ArrowRight size={18}/></button>
      </div>
    </section>
    <div className="home-grid">
      <section className="panel home-recent">
        <div className="panel-header"><div><p className="eyebrow">MY GARAGE</p><h2>Recent setups</h2></div><button className="button text-button" onClick={garage}>View garage <ArrowRight size={16}/></button></div>
        {recent.length ? <SetupList items={recent} open={open}/> : <Empty title="Your grid is clear."><p>Your saved setups and versions will appear here.</p><button className="button text-button accent" onClick={create}>Build your first setup <ArrowRight size={15}/></button></Empty>}
      </section>
      <section className="panel home-driver">
        <div className="panel-header"><div><p className="eyebrow">PERSONALIZATION</p><h2>Driver DNA</h2></div><span className="dna-mark" aria-hidden="true"><i/><i/><i/><i/><i/></span></div>
        <p className="muted">{profileConfigured ? 'Your driving preferences are applied to each new setup.' : 'Tune the balance around how you drive. Your preferences stay on this device.'}</p>
        <button className="button secondary" onClick={profile}>{profileConfigured ? 'Edit Driver DNA' : 'Set up Driver DNA'} <ArrowRight size={16}/></button>
      </section>
      {favorites.length > 0 && <section className="panel"><div className="panel-header"><h2>Favorites</h2><Star size={20} className="accent"/></div><SetupList items={favorites} open={open}/></section>}
      {withResearch && <section className="panel"><div className="panel-header"><h2>Latest research</h2><CircleHelp size={20}/></div><SetupList items={[withResearch]} open={open}/></section>}
    </div>
  </div>
}
