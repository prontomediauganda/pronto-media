
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <img
              src="/pronto-logo.png"
              alt="Pronto Media"
              className="w-56 mx-auto mb-5"
            />
          </Link>

          <h1 className="text-3xl font-bold text-[#252960]">
            Staff Login
          </h1>

          <p className="text-gray-500 mt-2">
            Sign in to the Pronto Media newsroom
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white border border-gray-200 shadow-lg rounded-2xl p-7 space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#252960] mb-2"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#dc7f29]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#252960] mb-2"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:border-[#dc7f29]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#252960] hover:bg-[#dc7f29] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Authorized Pronto Media staff only.
          </p>
        </form>

        <p className="text-center mt-6 text-sm">
          <Link to="/" className="text-[#252960] hover:text-[#dc7f29]">
            ← Return to Pronto Media
          </Link>
        </p>
      </div>
    </div>
  )
}
