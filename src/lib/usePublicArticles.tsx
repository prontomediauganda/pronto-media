
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'

export type Article = {
  id: string
  slug: string
  title: string
  section: string
  author: string
  publishedAt: string
  paragraphs: string[]
  images: string[]
}

type PublicArticlesContextType = {
  articles: Article[]
  loading: boolean
  error: string
}

const PublicArticlesContext =
  createContext<PublicArticlesContextType | undefined>(undefined)

export function PublicArticlesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPublishedArticles() {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          author_name,
          slug,
          content,
          featured_image,
          published_at,
          categories ( name )
        `)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })

      if (queryError) {
        setError(queryError.message)
        setArticles([])
        setLoading(false)
        return
      }

      const formatted = (data ?? []).map((item: any): Article => {
        const category = Array.isArray(item.categories)
          ? item.categories[0]
          : item.categories

        return {
          id: item.id,
          slug: item.slug,
          title: item.title,
          section: category?.name ?? 'Latest News',
          author: item.author_name || 'Pronto News Desk',
          publishedAt: item.published_at,
          paragraphs: (item.content ?? '')
            .split(/\n\s*\n/)
            .map((paragraph: string) => paragraph.trim())
            .filter(Boolean),
          images: item.featured_image ? [item.featured_image] : [],
        }
      })

      setArticles(formatted)
      setLoading(false)
    }

    void loadPublishedArticles()
  }, [])

  return (
    <PublicArticlesContext.Provider value={{ articles, loading, error }}>
      {children}
    </PublicArticlesContext.Provider>
  )
}

export function usePublicArticles() {
  const context = useContext(PublicArticlesContext)

  if (!context) {
    throw new Error(
      'usePublicArticles must be used inside PublicArticlesProvider.'
    )
  }

  return context
}
