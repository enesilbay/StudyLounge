import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import heroImg from './assets/hero.png'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

type View = 'dashboard' | 'lobbies' | 'leaderboard' | 'profile'
type AuthMode = 'login' | 'register'

type User = {
  id: number
  username: string
  fullName: string
  email?: string
  avatarUrl?: string
  totalFocusMinutes?: number
  isPremium?: boolean
}

type Lobby = {
  id: number
  name: string
  icon?: string
  description?: string
  activeUsers?: number
  maxUsers?: number
  isPrivate?: boolean
  isPremiumOnly?: boolean
}

type Leader = User & {
  totalFocusMinutes: number
}

type AuthResponse = {
  user: User
  access_token: string
  message?: string
}

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'D' },
  { id: 'lobbies', label: 'Lobbies', icon: 'L' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'R' },
  { id: 'profile', label: 'Profile', icon: 'P' },
]

function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('study_token') ?? '')
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('study_user')
    return stored ? (JSON.parse(stored) as User) : null
  })
  const [view, setView] = useState<View>('dashboard')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState({ fullName: '', username: '', email: '', password: '' })
  const [lobbies, setLobbies] = useState<Lobby[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [newLobby, setNewLobby] = useState({
    name: '',
    description: '',
    isPrivate: false,
    password: '',
    isPremiumOnly: false,
  })
  const [profileName, setProfileName] = useState(user?.fullName ?? '')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const authHeaders = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token],
  )

  const request = useCallback(async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(apiUrl(path), init)
    const data = (await response.json().catch(() => ({}))) as T & { message?: string }
    if (!response.ok) {
      throw new Error(data.message ?? 'Request failed')
    }
    return data
  }, [])

  const loadLobbies = useCallback(async () => {
    try {
      const data = await request<Lobby[]>('/lobbies', { headers: authHeaders })
      setLobbies(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Lobbies could not load')
    }
  }, [authHeaders, request])

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await request<Leader[]>('/users/leaderboard', { headers: authHeaders })
      setLeaders(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Leaderboard could not load')
    }
  }, [authHeaders, request])

  useEffect(() => {
    if (token) {
      void Promise.all([loadLobbies(), loadLeaderboard()])
    }
  }, [loadLeaderboard, loadLobbies, token])

  useEffect(() => {
    setProfileName(user?.fullName ?? '')
  }, [user?.fullName])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('')
    try {
      const body = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm
      const data = await request<AuthResponse>(`/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      localStorage.setItem('study_token', data.access_token)
      localStorage.setItem('study_user', JSON.stringify(data.user))
      setToken(data.access_token)
      setUser(data.user)
      setProfileName(data.user.fullName)
      setView('dashboard')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  async function createLobby(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setStatus('')
    try {
      await request<Lobby>('/lobbies', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: newLobby.name,
          description: newLobby.description,
          icon: newLobby.isPremiumOnly ? 'crown' : 'users',
          isPrivate: newLobby.isPrivate,
          password: newLobby.isPrivate ? newLobby.password : undefined,
          isPremiumOnly: newLobby.isPremiumOnly,
          maxUsers: newLobby.isPrivate ? 5 : 50,
        }),
      })
      setNewLobby({ name: '', description: '', isPrivate: false, password: '', isPremiumOnly: false })
      await loadLobbies()
      setStatus('Lobby created')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Lobby could not be created')
    } finally {
      setIsLoading(false)
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      return
    }
    setIsLoading(true)
    setStatus('')
    try {
      const data = await request<{ user: User }>(`/users/${user.id}/profile`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ fullName: profileName }),
      })
      setUser(data.user)
      localStorage.setItem('study_user', JSON.stringify(data.user))
      setStatus('Profile updated')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profile could not update')
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('study_token')
    localStorage.removeItem('study_user')
    setToken('')
    setUser(null)
    setLobbies([])
    setLeaders([])
    setStatus('')
  }

  if (!user || !token) {
    return (
      <main className="auth-shell">
        <section className="auth-visual">
          <img src={heroImg} alt="StudyLounge product preview" />
          <div>
            <p className="eyebrow">StudyLounge Web</p>
            <h1>Focus rooms, friends and progress in one calm workspace.</h1>
            <p>Sign in to manage lobbies, review the leaderboard and keep your profile aligned with the mobile app.</p>
          </div>
        </section>

        <section className="auth-panel">
          <div className="brand-mark">SL</div>
          <div className="auth-tabs" role="tablist" aria-label="Authentication">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
              Register
            </button>
          </div>

          <form className="form" onSubmit={handleAuth}>
            {authMode === 'register' ? (
              <>
                <label>
                  Full name
                  <input value={authForm.fullName} onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })} required />
                </label>
                <label>
                  Username
                  <input value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} required />
                </label>
              </>
            ) : null}
            <label>
              Email
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required />
            </label>
            <button className="primary-button" disabled={isLoading}>
              {isLoading ? 'Working...' : authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
          {status ? <p className="status">{status}</p> : null}
        </section>
      </main>
    )
  }

  const totalFocus = leaders.reduce((sum, leader) => sum + leader.totalFocusMinutes, 0)
  const activeUsers = lobbies.reduce((sum, lobby) => sum + (lobby.activeUsers ?? 0), 0)
  const currentLeader = leaders[0]
  const profile = leaders.find((leader) => leader.id === user.id) ?? user

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SL</div>
          <div>
            <strong>StudyLounge</strong>
            <span>Web Console</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <button className="ghost-button" onClick={logout}>Logout</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="user-pill">
            <span>{profile.fullName?.charAt(0) ?? 'S'}</span>
            <div>
              <strong>{profile.fullName}</strong>
              <small>@{profile.username}</small>
            </div>
          </div>
        </header>

        {status ? <div className="toast">{status}</div> : null}
        {view === 'dashboard' ? (
          <Dashboard activeUsers={activeUsers} lobbies={lobbies} totalFocus={totalFocus} currentLeader={currentLeader} onNavigate={setView} />
        ) : null}
        {view === 'lobbies' ? (
          <LobbiesView lobbies={lobbies} newLobby={newLobby} setNewLobby={setNewLobby} createLobby={createLobby} isLoading={isLoading} />
        ) : null}
        {view === 'leaderboard' ? <LeaderboardView leaders={leaders} /> : null}
        {view === 'profile' ? (
          <ProfileView user={profile} profileName={profileName} setProfileName={setProfileName} updateProfile={updateProfile} isLoading={isLoading} />
        ) : null}
      </section>
    </main>
  )
}

function viewTitle(view: View) {
  return {
    dashboard: 'Dashboard',
    lobbies: 'Lobbies',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
  }[view]
}

function Dashboard({
  activeUsers,
  lobbies,
  totalFocus,
  currentLeader,
  onNavigate,
}: {
  activeUsers: number
  lobbies: Lobby[]
  totalFocus: number
  currentLeader?: Leader
  onNavigate: (view: View) => void
}) {
  return (
    <div className="dashboard-grid">
      <Metric label="Open lobbies" value={String(lobbies.length)} tone="indigo" />
      <Metric label="Studying now" value={String(activeUsers)} tone="green" />
      <Metric label="Focus minutes" value={String(totalFocus)} tone="amber" />
      <section className="panel wide hero-panel">
        <div>
          <p className="eyebrow">Live study flow</p>
          <h2>Keep sessions visible without opening the mobile app.</h2>
          <p>Review active rooms, start a new study lobby and follow weekly momentum from one desktop surface.</p>
          <button className="primary-button small" onClick={() => onNavigate('lobbies')}>Manage lobbies</button>
        </div>
        <img src={heroImg} alt="StudyLounge dashboard preview" />
      </section>
      <section className="panel">
        <p className="eyebrow">Top student</p>
        <h2>{currentLeader?.fullName ?? 'No data yet'}</h2>
        <p>{currentLeader ? `${currentLeader.totalFocusMinutes} focus minutes` : 'Leaderboard will fill after study sessions.'}</p>
      </section>
      <section className="panel">
        <p className="eyebrow">Next move</p>
        <h2>Create a focused room</h2>
        <p>Private rooms protect the flow for small groups; elite rooms are reserved for premium students.</p>
      </section>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'indigo' | 'green' | 'amber' }) {
  return (
    <section className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  )
}

function LobbiesView({
  lobbies,
  newLobby,
  setNewLobby,
  createLobby,
  isLoading,
}: {
  lobbies: Lobby[]
  newLobby: { name: string; description: string; isPrivate: boolean; password: string; isPremiumOnly: boolean }
  setNewLobby: (value: { name: string; description: string; isPrivate: boolean; password: string; isPremiumOnly: boolean }) => void
  createLobby: (event: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}) {
  return (
    <div className="split-grid">
      <section className="panel">
        <p className="eyebrow">Create lobby</p>
        <h2>Open a new study room</h2>
        <form className="form compact" onSubmit={createLobby}>
          <label>
            Name
            <input value={newLobby.name} onChange={(event) => setNewLobby({ ...newLobby, name: event.target.value })} required />
          </label>
          <label>
            Description
            <textarea value={newLobby.description} onChange={(event) => setNewLobby({ ...newLobby, description: event.target.value })} rows={3} />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={newLobby.isPrivate} onChange={(event) => setNewLobby({ ...newLobby, isPrivate: event.target.checked })} />
            Private room
          </label>
          {newLobby.isPrivate ? (
            <label>
              Password
              <input type="password" value={newLobby.password} onChange={(event) => setNewLobby({ ...newLobby, password: event.target.value })} required />
            </label>
          ) : null}
          <label className="check-row">
            <input type="checkbox" checked={newLobby.isPremiumOnly} onChange={(event) => setNewLobby({ ...newLobby, isPremiumOnly: event.target.checked })} />
            Elite only
          </label>
          <button className="primary-button" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create lobby'}</button>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Rooms</p>
            <h2>Active lobbies</h2>
          </div>
          <span className="count-pill">{lobbies.length}</span>
        </div>
        <div className="room-list">
          {lobbies.length ? lobbies.map((lobby) => <LobbyRow key={lobby.id} lobby={lobby} />) : <p className="empty">No lobbies yet.</p>}
        </div>
      </section>
    </div>
  )
}

function LobbyRow({ lobby }: { lobby: Lobby }) {
  return (
    <article className="room-row">
      <div className={lobby.isPremiumOnly ? 'room-icon elite' : 'room-icon'}>{lobby.isPremiumOnly ? 'P' : lobby.isPrivate ? 'L' : 'S'}</div>
      <div>
        <strong>{lobby.name}</strong>
        <span>{lobby.description || 'Ready for focused study.'}</span>
      </div>
      <small>{lobby.activeUsers ?? 0}/{lobby.maxUsers ?? 50}</small>
    </article>
  )
}

function LeaderboardView({ leaders }: { leaders: Leader[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Rankings</p>
          <h2>Focus leaderboard</h2>
        </div>
      </div>
      <div className="leader-list">
        {leaders.length ? (
          leaders.map((leader, index) => (
            <article key={leader.id} className={index < 3 ? 'leader-row top' : 'leader-row'}>
              <span className="rank">{index + 1}</span>
              <div className="avatar">{leader.fullName?.charAt(0) ?? 'S'}</div>
              <div>
                <strong>{leader.fullName}</strong>
                <small>@{leader.username}</small>
              </div>
              <strong className="score">{leader.totalFocusMinutes}</strong>
            </article>
          ))
        ) : (
          <p className="empty">No leaderboard data yet.</p>
        )}
      </div>
    </section>
  )
}

function ProfileView({
  user,
  profileName,
  setProfileName,
  updateProfile,
  isLoading,
}: {
  user: User
  profileName: string
  setProfileName: (value: string) => void
  updateProfile: (event: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}) {
  return (
    <div className="profile-grid">
      <section className="panel profile-card">
        <div className="large-avatar">{user.fullName?.charAt(0) ?? 'S'}</div>
        <h2>{user.fullName}</h2>
        <p>@{user.username}</p>
        <div className="profile-stats">
          <Metric label="Focus" value={String(user.totalFocusMinutes ?? 0)} tone="indigo" />
          <Metric label="Premium" value={user.isPremium ? 'Yes' : 'No'} tone="amber" />
        </div>
      </section>
      <section className="panel">
        <p className="eyebrow">Settings</p>
        <h2>Update profile</h2>
        <form className="form compact" onSubmit={updateProfile}>
          <label>
            Full name
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} required />
          </label>
          <button className="primary-button" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save profile'}</button>
        </form>
      </section>
    </div>
  )
}

export default App
