
import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  FileText,
  Send,
  Save,
  ImagePlus,
  X,
  Pencil,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type Category = {
  id: number
  name: string
  slug: string
}

type Article = {
  id: string
  title: string
  slug: string
  status: string
  created_at: string
  categories: { name: string } | null
}

type ArticleRow = {
  id: string
  title: string
  slug: string
  status: string
  created_at: string
  categories: { name: string } | { name: string }[] | null
}

type ArticleDetails = {
  id: string
  title: string
  author_name: string | null
  excerpt: string | null
  content: string
  category_id: number
  featured_image: string | null
  status: string
  slug: string
}

const BUCKET = 'article-images'

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [articleResult, categoryResult] = await Promise.all([
        supabase
          .from('articles')
          .select(`
            id,
            title,
            slug,
            status,
            created_at,
            categories ( name )
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('categories')
          .select('id, name, slug')
          .order('name'),
      ])

      if (articleResult.error) throw new Error(articleResult.error.message)
      if (categoryResult.error) throw new Error(categoryResult.error.message)

      const articleRows = (articleResult.data ?? []) as unknown as ArticleRow[]

      setArticles(
        articleRows.map((article) => ({
          id: article.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
          created_at: article.created_at,
          categories: Array.isArray(article.categories)
            ? article.categories[0] ?? null
            : article.categories,
        }))
      )

      setCategories((categoryResult.data ?? []) as Category[])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load articles.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(imageFile)
    setImagePreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [imageFile])

  function makeSlug(value: string) {
    const base = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return `${base}-${Date.now().toString(36)}`
  }

  function getStoragePath(url: string | null) {
    if (!url) return null

    try {
      const parsedUrl = new URL(url)
      const marker = `/storage/v1/object/public/${BUCKET}/`
      const index = parsedUrl.pathname.indexOf(marker)

      if (index === -1) return null

      return decodeURIComponent(
        parsedUrl.pathname.slice(index + marker.length)
      )
    } catch {
      return null
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPG, PNG or WebP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.')
      return
    }

    setError('')
    setImageFile(file)
    setRemoveExistingImage(false)
  }

  function resetForm() {
    setTitle('')
    setAuthorName('')
    setExcerpt('')
    setContent('')
    setCategoryId('')
    setImageFile(null)
    setImagePreview('')
    setExistingImage(null)
    setRemoveExistingImage(false)
    setEditingId(null)
  }

  function openNewArticle() {
    resetForm()
    setError('')
    setMessage('')
    setShowForm(true)
  }

  async function editArticle(articleId: string) {
    setError('')
    setMessage('')

    try {
      const { data, error: fetchError } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          author_name,
          excerpt,
          content,
          category_id,
          featured_image,
          status,
          slug
        `)
        .eq('id', articleId)
        .single()

      if (fetchError || !data) {
        throw new Error(fetchError?.message || 'Could not load article.')
      }

      const article = data as ArticleDetails

      setEditingId(article.id)
      setTitle(article.title)
      setAuthorName(article.author_name || '')
      setExcerpt(article.excerpt || '')
      setContent(article.content || '')
      setCategoryId(String(article.category_id))
      setExistingImage(article.featured_image)
      setImageFile(null)
      setImagePreview('')
      setRemoveExistingImage(false)
      setShowForm(true)

      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not open this article.'
      )
    }
  }

  async function uploadImage(userId: string) {
    if (!imageFile) return null

    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, imageFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: imageFile.type,
      })

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function saveArticle(submitForApproval = false) {
    setError('')
    setMessage('')

    if (
      !title.trim() ||
      !authorName.trim() ||
      !content.trim() ||
      !categoryId
    ) {
      setError(
        'Please enter the headline, reporter name, category and article content.'
      )
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      let uploadedImageUrl: string | null = null

      if (imageFile) {
        uploadedImageUrl = await uploadImage(user.id)
      }

      const featuredImage = imageFile
        ? uploadedImageUrl
        : removeExistingImage
          ? null
          : existingImage

      if (editingId) {
        const updateData: Record<string, unknown> = {
          title: title.trim(),
          author_name: authorName.trim(),
          excerpt: excerpt.trim(),
          content: content.trim(),
          category_id: Number(categoryId),
          featured_image: featuredImage,
          updated_at: new Date().toISOString(),
        }

        // Editing a published article keeps it published.
        // Editing a draft or rejected article and submitting sends it
        // back into the editorial approval queue.
        if (submitForApproval) {
          updateData.status = 'submitted'
        }

        const { error: updateError } = await supabase
          .from('articles')
          .update(updateData)
          .eq('id', editingId)

        if (updateError) {
          throw new Error(updateError.message)
        }

        // Remove the old image only after the database update succeeds.
        if (imageFile || removeExistingImage) {
          const oldPath = getStoragePath(existingImage)

          if (oldPath) {
            const { error: deleteImageError } = await supabase.storage
              .from(BUCKET)
              .remove([oldPath])

            if (deleteImageError) {
              setMessage(
                'Article updated, but the old image could not be removed from storage.'
              )
            }
          }
        }

        setMessage(
          submitForApproval
            ? 'Article updated and submitted for approval.'
            : 'Article updated successfully.'
        )
      } else {
        const { data: article, error: insertError } = await supabase
          .from('articles')
          .insert({
            title: title.trim(),
            slug: makeSlug(title),
            author_name: authorName.trim(),
            excerpt: excerpt.trim(),
            content: content.trim(),
            category_id: Number(categoryId),
            author_id: user.id,
            featured_image: featuredImage,
            status: 'draft',
          })
          .select('id')
          .single()

        if (insertError || !article) {
          throw new Error(
            insertError?.message || 'Could not create the article.'
          )
        }

        if (submitForApproval) {
          const { error: submitError } = await supabase
            .from('articles')
            .update({ status: 'submitted' })
            .eq('id', article.id)

          if (submitError) {
            throw new Error(
              `Article saved as a draft, but submission failed: ${submitError.message}`
            )
          }
        }

        setMessage(
          submitForApproval
            ? 'Article submitted successfully for approval.'
            : 'Article saved successfully as a draft.'
        )
      }

      resetForm()
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle(articleId: string, articleTitle: string) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${articleTitle}"? This cannot be undone.`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Please sign in again.')

      // Fetch the image path before deleting the article.
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('featured_image')
        .eq('id', articleId)
        .single()

      if (fetchError) throw new Error(fetchError.message)

      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)

      if (deleteError) throw new Error(deleteError.message)

      // Delete the image after the article has been deleted.
      const imagePath = getStoragePath(article?.featured_image ?? null)

      if (imagePath) {
        const { error: imageDeleteError } = await supabase.storage
          .from(BUCKET)
          .remove([imagePath])

        if (imageDeleteError) {
          setMessage(
            'Article deleted, but its image could not be removed from storage.'
          )
        } else {
          setMessage('Article and featured image deleted successfully.')
        }
      } else {
        setMessage('Article deleted successfully.')
      }

      if (editingId === articleId) {
        resetForm()
        setShowForm(false)
      }

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete this article.'
      )
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case 'published':
        return 'bg-green-50 text-green-700'
      case 'submitted':
        return 'bg-blue-50 text-blue-700'
      case 'rejected':
        return 'bg-red-50 text-red-700'
      case 'approved':
        return 'bg-purple-50 text-purple-700'
      default:
        return 'bg-orange-50 text-[#dc7f29]'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#252960] text-white px-5 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">
              Pronto <span className="text-[#dc7f29]">Media</span>
            </h1>
            <p className="text-xs text-white/60 mt-1">ARTICLE MANAGEMENT</p>
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
            <h2 className="text-2xl font-bold text-[#252960]">Articles</h2>
            <p className="text-sm text-slate-500 mt-1">
              Create, edit and manage newsroom stories.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void loadData()}
              disabled={loading || saving}
              className="border bg-white border-slate-300 rounded-lg px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openNewArticle}
              className="bg-[#dc7f29] hover:bg-[#c66d1d] text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={17} />
              New Article
            </button>
          </div>
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

        {showForm && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-7 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#252960]">
                {editingId ? 'Edit Article' : 'Create a New Article'}
              </h3>
              {editingId && (
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  Editing article
                </span>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Article headline
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your article headline"
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#dc7f29]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Reporter / Author Name
                </label>
                <input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Enter the reporter's or author's name"
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#dc7f29]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 bg-white outline-none focus:border-[#dc7f29]"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Short summary
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  placeholder="Write a short introduction to the story..."
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#dc7f29]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Article content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  placeholder="Write the full article here. Separate paragraphs with blank lines."
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-[#dc7f29]"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Separate paragraphs with a blank line.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Featured Article Image
                </label>

                {existingImage && !removeExistingImage && !imageFile && (
                  <div className="mb-4 max-w-md">
                    <img
                      src={existingImage}
                      alt="Current featured image"
                      className="w-full h-56 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveExistingImage(true)
                        setExistingImage(null)
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <X size={16} />
                      Remove current image
                    </button>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-[#dc7f29] transition">
                  <ImagePlus size={30} className="text-[#dc7f29]" />
                  <span className="text-sm font-semibold text-[#252960]">
                    {existingImage || imageFile
                      ? 'Choose a replacement image'
                      : 'Choose an image from your computer'}
                  </span>
                  <span className="text-xs text-slate-400">
                    JPG, PNG or WebP · Maximum 5 MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {imagePreview && (
                  <div className="mt-4 relative max-w-md">
                    <img
                      src={imagePreview}
                      alt="New featured image preview"
                      className="w-full h-56 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="absolute top-2 right-2 bg-white text-red-600 rounded-full p-2 shadow"
                      aria-label="Remove selected replacement image"
                    >
                      <X size={18} />
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                      {imageFile?.name}
                    </p>
                  </div>
                )}

                {removeExistingImage && !imageFile && (
                  <p className="text-sm text-orange-700 mt-3">
                    The current image will be removed when you save.
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveExistingImage(false)
                        // Reload the existing image from the database.
                        if (editingId) void editArticle(editingId)
                      }}
                      className="underline ml-2"
                    >
                      Undo
                    </button>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => void saveArticle(false)}
                  disabled={saving}
                  className="bg-[#252960] text-white px-5 py-3 rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                >
                  <Save size={17} />
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Save as Draft'}
                </button>

                {!editingId && (
                  <button
                    onClick={() => void saveArticle(true)}
                    disabled={saving}
                    className="bg-[#dc7f29] text-white px-5 py-3 rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <Send size={17} />
                    {saving ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                )}

                {editingId && (
                  <button
                    onClick={() => void saveArticle(true)}
                    disabled={saving}
                    className="bg-[#dc7f29] text-white px-5 py-3 rounded-lg flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <Send size={17} />
                    {saving ? 'Submitting...' : 'Save and Submit for Approval'}
                  </button>
                )}

                <button
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                    setError('')
                  }}
                  disabled={saving}
                  className="border border-slate-300 px-5 py-3 rounded-lg text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center gap-2">
            <FileText className="text-[#dc7f29]" size={20} />
            <h3 className="font-bold text-[#252960]">
              All Articles ({articles.length})
            </h3>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading articles...</p>
          ) : articles.length === 0 ? (
            <div className="p-10 text-center">
              <FileText size={35} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-[#252960]">No articles yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Create your first newsroom story.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4">Headline</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date created</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-t border-slate-100">
                      <td className="p-4 font-medium text-[#252960] min-w-64">
                        {article.title}
                      </td>
                      <td className="p-4 text-slate-600">
                        {article.categories?.name || 'Uncategorised'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-md text-xs capitalize ${statusStyle(article.status)}`}
                        >
                          {article.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        {new Date(article.created_at).toLocaleDateString('en-UG')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void editArticle(article.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#252960] hover:bg-slate-50"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              void deleteArticle(article.id, article.title)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
