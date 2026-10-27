
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Newspaper,
  ClipboardCheck,
  Users,
  LogOut,
  FileText,
  Clock,
  CheckCircle,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Profile = {
  full_name: string | null
  email: string | null
  role: string
}

type Article = {
  id: string
  title: string
  status: string
  created_at: string
}

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    submitted: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  async function loadDashboard() {
    setLoading(true)
    setError('')

    const { data: { user }, error: userError } =
      await supabase.auth.getUser()

    if (userError || !user) {
      navigate('/admin/login', { replace: true })
      return
    }

    const { data: userProfile, error: profileError } =
      await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .single()

    if (profileError) {
      setError('Unable to load your staff profile.')
      setLoading(false)
      return
    }

    setProfile(userProfile)

    const [
      totalResult,
      publishedResult,
      draftsResult,
      submittedResult,
      recentResult,
    ] = await Promise.all([
      supabase.from('articles').select('id', {
        count: 'exact',
        head: true,
      }),

      supabase.from('articles').select('id', {
        count: 'exact',
        head: true,
      }).eq('status', 'published'),

      supabase.from('articles').select('id', {
        count: 'exact',
        head: true,
      }).eq('status', 'draft'),

      supabase.from('articles').select('id', {
        count: 'exact',
        head: true,
      }).eq('status', 'submitted'),

      supabase.from('articles')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const queryError = recentResult.error ||
      totalResult.error ||
      publishedResult.error ||
      draftsResult.error ||
      submittedResult.error

    if (queryError) {
      setError('Some dashboard information could not be loaded.')
    }

    setStats({
      total: totalResult.count ?? 0,
      published: publishedResult.count ?? 0,
      drafts: draftsResult.count ?? 0,
      submitted: submittedResult.count ?? 0,
    })

    setArticles(recentResult.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError('Unable to sign out. Please try again.')
      return
    }

    navigate('/admin/login', { replace: true })
  }

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard, href: '/admin' },
    { label: 'All Articles', icon: Newspaper, href: '/admin/articles' },
    { label: 'Approval Queue', icon: ClipboardCheck, href: '/admin/approvals' },
    { label: 'Staff', icon: Users, href: '/admin/staff' },
  ]

  const statCards = [
    { label: 'Total Articles', value: stats.total, icon: FileText },
    { label: 'Published', value: stats.published, icon: CheckCircle },
    { label: 'Drafts', value: stats.drafts, icon: Clock },
    { label: 'Awaiting Approval', value: stats.submitted, icon: ClipboardCheck },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* Mobile header */}
      <header className="lg:hidden bg-[#252960] text-white p-4 flex justify-between items-center">
        <div className="font-bold text-lg">
          Pronto <span className="text-[#dc7f29]">Media</span>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className={`${
          menuOpen ? 'block' : 'hidden'
        } lg:block w-64 bg-[#252960] text-white fixed lg:sticky top-0 left-0 h-screen z-40 shrink-0`}>

          <div className="p-6 border-b border-white/10">
            <div className="text-2xl font-bold">
              Pronto <span className="text-[#dc7f29]">Media</span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              NEWSROOM MANAGEMENT
            </p>
          </div>

          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${
                    item.href === '/admin'
                      ? 'bg-[#dc7f29] text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon size={19} />
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <Link
              to="/"
              className="block text-sm text-white/70 hover:text-white mb-4"
            >
              ← View public website
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-sm text-white/80 hover:text-[#dc7f29]"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">

          <header className="hidden lg:flex bg-white border-b border-slate-200 px-8 py-5 justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-[#252960]">
                Newsroom Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Manage your newsroom and publications.
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold text-[#252960]">
                {profile?.full_name || profile?.email || 'Staff member'}
              </p>
              <p className="text-xs text-[#dc7f29] capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
          </header>

          <div className="p-5 sm:p-8">

            <div className="flex flex-wrap justify-between items-center gap-3 mb-7">
              <div>
                <h2 className="text-2xl font-bold text-[#252960]">
                  Overview
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Welcome to your Pronto Media newsroom.
                </p>
              </div>

              <button
                onClick={loadDashboard}
                disabled={loading}
                className="flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 rounded-lg text-sm hover:border-[#dc7f29]"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {statCards.map((card) => {
                const Icon = card.icon

                return (
                  <div
                    key={card.label}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-slate-500">
                        {card.label}
                      </p>
                      <div className="bg-orange-50 text-[#dc7f29] p-2 rounded-lg">
                        <Icon size={20} />
                      </div>
                    </div>

                    <p className="text-3xl font-bold text-[#252960]">
                      {loading ? '...' : card.value}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Recent articles */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-[#252960]">
                    Recent Articles
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    The latest newsroom activity.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="p-6 text-sm text-slate-500">
                  Loading articles...
                </p>
              ) : articles.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">
                  No articles have been created yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-4 font-medium">Article</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Date created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {articles.map((article) => (
                        <tr key={article.id} className="border-t border-slate-100">
                          <td className="p-4 font-medium text-[#252960]">
                            {article.title}
                          </td>
                          <td className="p-4">
                            <span className="bg-orange-50 text-[#dc7f29] px-2 py-1 rounded-md text-xs capitalize">
                              {article.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {new Date(article.created_at).toLocaleDateString('en-UG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="text-xs text-slate-400 mt-8 text-center">
              Pronto Media Newsroom Management System
            </p>

          </div>
        </main>
      </div>
    </div>
  )
}
