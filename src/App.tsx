
import { useState } from 'react'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'
import { ArrowUp, Menu, X } from 'lucide-react'

import AdminArticles from './pages/AdminArticles'
import AdminDashboard from './pages/AdminDashboard'
import AdminApprovals from './pages/AdminApprovals'
import AdminLogin from './pages/AdminLogin'
import AdminProtected from './pages/AdminProtected'

import {
  PublicArticlesProvider,
  usePublicArticles,
} from './lib/usePublicArticles'

import type { Article } from './lib/usePublicArticles'

const sections = [
  'Latest News',
  'Uganda',
  'Africa',
  'World',
  'Business',
  'Politics',
  'Technology',
  'Sports',
]

const socialLinks = [
  { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' },
  { name: 'YouTube', icon: 'youtube', url: 'https://youtube.com/' },
  { name: 'WhatsApp', icon: 'whatsapp', url: 'https://whatsapp.com/' },
  { name: 'Instagram', icon: 'instagram', url: 'https://instagram.com/' },
  { name: 'X', icon: 'x', url: 'https://x.com/' },
  { name: 'TikTok', icon: 'tiktok', url: 'https://tiktok.com/' },
  { name: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/' },
  { name: 'Telegram', icon: 'telegram', url: 'https://telegram.org/' },
]

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-UG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sectionPath(section: string) {
  return `/section/${section.toLowerCase().replace(/\s+/g, '-')}`
}

function Header({ home = false }: { home?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  function isActive(path: string) {
    return path === '/'
      ? location.pathname === '/'
      : location.pathname === path
  }

  return (
    <>
      <header className={`top-header ${home ? 'home-header' : 'inner-header'}`}>
        <a href="mailto:support@prontomedia.com" className="top-link">
          <span>Support</span> <strong>Pronto</strong>
        </a>

        <a href="mailto:news@prontomedia.com" className="top-link">
          <span>Report News</span> <strong>Pronto</strong>
        </a>
      </header>

      <section className={`branding ${home ? 'home-branding' : 'compact-branding'}`}>
        <Link to="/" aria-label="Pronto Media home">
          <img
            src="/pronto-logo.png"
            alt="Pronto Media"
            className="brand-logo"
          />
        </Link>

        {home && (
          <h1 className="tagline">
            Fast<span>.</span> Factual<span>.</span> Relevant<span>.</span>
          </h1>
        )}
      </section>

      <div className="mobile-menu-bar">
        <span>Sections</span>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <nav className={`main-navigation ${menuOpen ? 'menu-open' : ''}`}>
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className={`nav-link ${isActive('/') ? 'active' : ''}`}
        >
          Home
        </Link>

        {sections.map((section) => {
          const path = sectionPath(section)

          return (
            <Link
              key={section}
              to={path}
              onClick={() => setMenuOpen(false)}
              className={`nav-link ${isActive(path) ? 'active' : ''}`}
            >
              {section}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

function NewsCard({ article }: { article: Article }) {
  return (
    <article className="news-card">
      <Link
        to={`/article/${article.slug}`}
        className="news-image"
        aria-label={`Read ${article.title}`}
      >
        {article.images.length > 0 && (
          <img src={article.images[0]} alt="" />
        )}
      </Link>

      <p className="news-category">{article.section}</p>

      <h2 className="news-headline">
        <Link to={`/article/${article.slug}`}>
          {article.title}
        </Link>
      </h2>

      <p className="news-time">{formatDate(article.publishedAt)}</p>
    </article>
  )
}

function NewsGrid({ items }: { items: Article[] }) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const visibleNews = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <>
      {items.length > 0 ? (
        <div className="news-grid">
          {visibleNews.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="empty-news">
          There are no published stories in this section yet.
        </p>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next Page
          </button>
        </div>
      )}
    </>
  )
}

function HomePage() {
  const { articles, loading, error } = usePublicArticles()

  return (
    <>
      <Header home />

      <main className="news-container home-news">
        <h2 className="page-heading">Latest News</h2>

        {loading ? (
          <p className="empty-news">Loading latest news...</p>
        ) : error ? (
          <p className="empty-news">Could not load news: {error}</p>
        ) : (
          <NewsGrid items={articles} />
        )}
      </main>

      <Footer />
    </>
  )
}

function SectionPage() {
  const { sectionSlug } = useParams<{ sectionSlug: string }>()
  const { articles, loading, error } = usePublicArticles()

  const sectionName = sections.find(
    (section) => section.toLowerCase().replace(/\s+/g, '-') === sectionSlug
  )

  const sectionArticles =
    sectionName === 'Latest News'
      ? articles
      : articles.filter((article) => article.section === sectionName)

  return (
    <>
      <Header />

      <main className="news-container section-news">
        <h1 className="page-heading">
          {sectionName || 'Section not found'}
        </h1>

        {!sectionName ? (
          <p>This section could not be found.</p>
        ) : loading ? (
          <p className="empty-news">Loading stories...</p>
        ) : error ? (
          <p className="empty-news">Could not load stories: {error}</p>
        ) : (
          <NewsGrid items={sectionArticles} />
        )}
      </main>

      <Footer />
    </>
  )
}

function ArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { articles, loading, error } = usePublicArticles()

  if (loading) {
    return <p className="empty-news">Loading article...</p>
  }

  if (error) {
    return <p className="empty-news">Could not load article: {error}</p>
  }

  const article = articles.find((item) => item.slug === slug)

  if (!article) {
    return (
      <>
        <Header />

        <main className="news-container">
          <h1 className="page-heading">Article not found</h1>

          <p>This article may have been moved or is no longer available.</p>

          <Link to="/" className="back-link">
            Return to Home
          </Link>
        </main>

        <Footer />
      </>
    )
  }

  const latestArticles = articles
    .filter((item) => item.id !== article.id)
    .slice(0, 3)

  return (
    <>
      <Header />

      <main className="article-container">
        <article className="article-content">
          <p className="article-category">{article.section}</p>

          <h1 className="article-title">{article.title}</h1>

          <p className="article-time">
            {formatDate(article.publishedAt)}
          </p>

          <p className="article-author">
            By <strong>{article.author}</strong>
          </p>

          <div className="article-body">
            {article.paragraphs.map((paragraph, index) => (
              <div key={index}>
                <p>{paragraph}</p>

                {index === 0 && article.images[0] && (
                  <img
                    src={article.images[0]}
                    alt={article.title}
                    className="article-image"
                  />
                )}
              </div>
            ))}
          </div>
        </article>

        <section className="latest-panel">
          <h2 className="page-heading">Latest News</h2>

          <div className="latest-news-grid">
            {latestArticles.map((item) => (
              <NewsCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function Footer() {
  const location = useLocation()
  const { articles } = usePublicArticles()

  const articleSlug = location.pathname.startsWith('/article/')
    ? location.pathname.split('/').pop()
    : undefined

  const articleSection = articles.find(
    (item) => item.slug === articleSlug
  )?.section

  function isCurrentSection(section: string) {
    if (section === 'Home') return location.pathname === '/'

    if (articleSection) return section === articleSection

    return location.pathname === sectionPath(section)
  }

  return (
    <>
      <button
        type="button"
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUp size={14} />
        Back to the top
      </button>

      <footer className="site-footer">
        <div className="social-section">
          <h2>Follow us on social media</h2>

          <div className="social-grid">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                title={social.name}
                className="social-icon"
              >
                <img
                  src={`https://cdn.simpleicons.org/${social.icon}/252960`}
                  alt=""
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>

        <div className="footer-sections">
          <h2>
            Check out other
            <br />
            sections of the website
          </h2>

          <div className="footer-links">
            {['Home', ...sections].map((section) => (
              <Link
                key={section}
                to={section === 'Home' ? '/' : sectionPath(section)}
                className={isCurrentSection(section) ? 'current-section' : ''}
              >
                {section}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <PublicArticlesProvider>
        <Routes>
          {/* Public website pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/section/:sectionSlug" element={<SectionPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />

          {/* Staff sign-in */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected staff area */}
          <Route
            path="/admin"
            element={
              <AdminProtected>
                <AdminDashboard />
              </AdminProtected>
            }
          />

          <Route
            path="/admin/approvals"
            element={
              <AdminProtected>
                <AdminApprovals />
              </AdminProtected>
            }
          />

          <Route
            path="/admin/articles"
            element={
              <AdminProtected>
                <AdminArticles />
              </AdminProtected>
            }
          />

          {/* Unknown routes return to homepage */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </PublicArticlesProvider>
    </BrowserRouter>
  )
}

export default App
