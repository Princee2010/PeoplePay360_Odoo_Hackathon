import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { resetPassword } from '../services/authService'

function ResetPassword() {
  const navigate = useNavigate()
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(token, password)
      setIsDone(true)
      toast.success('Password updated. Please sign in.')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to reset password'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-decoration decoration-one" />
      <div className="auth-decoration decoration-two" />
      <section className="login-panel" aria-labelledby="reset-title">
        <div className="brand-mark">P</div>
        <p className="eyebrow">PeoplePay360</p>
        <h1 id="reset-title">Choose a new password</h1>
        <p className="intro">
          {isDone
            ? 'Your password has been updated.'
            : 'Enter a new password for your account. This link can only be used once.'}
        </p>

        {isDone ? (
          <button type="button" className="login-button" onClick={() => navigate('/login', { replace: true })}>
            Go to sign in
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="password">New password</label>
            <div className="input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a new password"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label htmlFor="confirmPassword">Confirm new password</label>
            <div className="input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update password'}
              {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default ResetPassword