
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type AdminProtectedProps = {
  children: ReactNode
}

export default function AdminProtected({ children }: AdminProtectedProps) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let active = true

    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (active) {
          setAuthorized(false)
          setLoading(false)
        }
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      const allowedRoles = [
        'super_admin',
        'editor',
        'journalist',
        'contributor',
      ]

      if (active) {
        setAuthorized(!error && allowedRoles.includes(profile?.role))
        setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(() => {
        checkUser()
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking access...
      </div>
    )
  }

  if (!authorized) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
