
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  ShieldAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Article = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  status: string
  created_at: string
  author_id: string
  categories: { name: string } | null
}

type ArticleRow = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  status: string
  created_at: string
  author_id: string
  categories: { name: string } | { name: string }[] | null
}

const EDITOR_ROLES = ['editor', 'super_admin']

export default function AdminApprovals() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  const loadArticles = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Please sign in again.')
      }

      setUserId(user.id)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (!EDITOR_ROLES.includes(profile.role)) {
        setAuthorized(false)
        setArticles([])
        return
      }

      setAuthorized(true)

      const { data, error: articlesError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          content,
          status,
          created_at,
          author_id,
          categories ( name )
        `)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: true })

      if (articlesError) {
        throw new Error(articlesError.message)
      }

      const rows = (data ?? []) as unknown as ArticleRow[]

      const formattedArticles: Article[] = rows.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        status: article.status,
        created_at: article.created_at,
        author_id: article.author_id,
        categories: Array.isArray(article.categories)
          ? article.categories[0] ?? null
          : article.categories,
      }))

      setArticles(formattedArticles)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load the approval queue.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadArticles()
  }, [loadArticles])

  async function updateArticle(
    article: Article,
    action: 'approve' | 'reject' | 'publish'
  ) {
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    const actionDetails = {
      approve: {
        oldStatus: 'submitted',
        newStatus: 'approved',
        activity: 'approved',
        success: 'Article approved. It is not public yet.',
      },
      reject: {
        oldStatus: 'submitted',
        newStatus: 'rejected',
        activity: 'rejected',
        success: 'Article rejected.',
      },
      publish: {
        oldStatus: 'approved',
        newStatus: 'published',
        activity: 'published',
        success: 'Article published successfully.',
      },
    }[action]

    const confirmation = window.confirm(
      action === 'approve'
        ? `Approve "${article.title}"?`
        : action === 'reject'
          ? `Reject "${article.title}"?`
          : `Publish "${article.title}" on the public website?`
    )

    if (!confirmation) return

    setWorkingId(article.id)
    setError('')
    setMessage('')

    try {
      const updateValues: {
        status: string
        editor_id: string
        published_at?: string
      } = {
        status: actionDetails.newStatus,
        editor_id: userId,
      }

      if (action === 'publish') {
        updateValues.published_at = new Date().toISOString()
      }

      const { data: updatedArticle, error: updateError } = await supabase
        .from('articles')
        .update(updateValues)
        .eq('id', article.id)
        .eq('status', actionDetails.oldStatus)
        .select('id')
        .maybeSingle()

      if (updateError) {
        throw new Error(updateError.message)
      }

      if (!updatedArticle) {
        throw new Error(
          'This article has already changed status. Refresh the page and try again.'
        )
      }

      const { error: activityError } = await supabase
        .from('article_activity')
        .insert({
          article_id: article.id,
          user_id: userId,
          action: actionDetails.activity,
          notes: `Article ${actionDetails.activity} by editor.`,
        })

      if (activityError) {
        setMessage(
          `${actionDetails.success} Warning: the activity history could not be saved: ${activityError.message}`
        )
      } else {
        setMessage(actionDetails.success)
      }

      setSelectedArticle(null)
      await loadArticles()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'The article could not be updated.'
      )
    } finally {
      setWorkingId(null)
    }
  }

  if (!loading && !authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <ShieldAlert size={42} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-[#252960]">
            Access restricted
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Only editors and super admins can access the approval queue.
          </p>
          <Link
            to="/admin"
            className="inline-block mt-5 bg-[#252960] text-white px-5 py-3 rounded-lg text-sm"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#252960] text-white px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">
              Pronto <span className="text-[#dc7f29]">Media</span>
            </h1>
            <p className="text-xs text-white/60 mt-1">
              EDITORIAL APPROVAL QUEUE
            </p>
          </div>

          <Link
            to="/admin"
            className="text-sm text-white/80 hover:text-[#dc7f29]"
          >
            <ArrowLeft className="inline mr-1" size={16} />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
          <div>
            <h2 className="text-2xl font-bold text-[#252960]">
              Editorial Approval
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Review submissions, approve stories and publish them.
            </p>
          </div>

          <button
            onClick={() => void loadArticles()}
            disabled={loading}
            className="border bg-white border-slate-300 rounded-lg px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-5 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-5 text-sm">
            {error}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-7">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-500">Awaiting approval</p>
            <p className="text-3xl font-bold text-[#252960] mt-2">
              {articles.filter((article) => article.status === 'submitted').length}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-500">Approved, awaiting publication</p>
            <p className="text-3xl font-bold text-[#dc7f29] mt-2">
              {articles.filter((article) => article.status === 'approved').length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Loading submissions...
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <FileText size={38} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-[#252960]">
              No articles in the queue
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Submitted and approved articles will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <section
                key={article.id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block rounded-md px-2 py-1 text-xs font-semibold capitalize ${
                        article.status === 'submitted'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {article.status === 'submitted'
                        ? 'Awaiting approval'
                        : 'Approved'}
                    </span>

                    <h3 className="text-lg font-bold text-[#252960] mt-3">
                      {article.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-2">
                      {article.categories?.name || 'Uncategorised'}
                      {' · '}
                      Submitted {new Date(article.created_at).toLocaleDateString('en-UG')}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedArticle(
                        selectedArticle?.id === article.id ? null : article
                      )
                    }
                    className="text-sm text-[#252960] font-semibold underline underline-offset-4"
                  >
                    {selectedArticle?.id === article.id
                      ? 'Hide article'
                      : 'Read article'}
                  </button>
                </div>

                {article.excerpt && (
                  <p className="text-sm text-slate-600 mt-4">
                    {article.excerpt}
                  </p>
                )}

                {selectedArticle?.id === article.id && (
                  <div className="mt-5 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-[#252960] mb-3">
                      Full article
                    </h4>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-7">
                      {article.content}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-100">
                  {article.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => void updateArticle(article, 'approve')}
                        disabled={workingId === article.id}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        {workingId === article.id ? 'Working...' : 'Approve'}
                      </button>

                      <button
                        onClick={() => void updateArticle(article, 'reject')}
                        disabled={workingId === article.id}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </>
                  )}

                  {article.status === 'approved' && (
                    <button
                      onClick={() => void updateArticle(article, 'publish')}
                      disabled={workingId === article.id}
                      className="bg-[#dc7f29] hover:bg-[#c66d1d] text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send size={16} />
                      {workingId === article.id ? 'Publishing...' : 'Publish Article'}
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}