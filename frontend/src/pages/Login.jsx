import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight, UserRound, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { loginUser, registerUser, requestPasswordReset } from '../services/authService'
import { useNavigate } from 'react-router-dom'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isForgotSubmitted, setIsForgotSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const resetForgotState = () => {
    setIsForgotPassword(false)
    setIsForgotSubmitted(false)
    setForgotEmail('')
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await requestPasswordReset(forgotEmail)
      setIsForgotSubmitted(true)
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to send reset email'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (event) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isRegistering && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const data = isRegistering
        ? await registerUser({ name: form.name, email: form.email, password: form.password })
        : await loginUser({ email: form.email, password: form.password })
      toast.success(isRegistering ? 'Your account is ready' : `Welcome , ${data.user.name}`)
      onLogin(data.user)
      navigate('/', { replace: true })
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Unable to complete the request'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isForgotPassword) {
    return (
      <main className="auth-shell">
        <div className="auth-decoration decoration-one" />
        <div className="auth-decoration decoration-two" />
        <section className="login-panel" aria-labelledby="forgot-title">
          <div className="brand-mark">P</div>
          <p className="eyebrow">PeoplePay360</p>
          <h1 id="forgot-title">Reset your password</h1>
          <p className="intro">
            {isForgotSubmitted
              ? "If that email is registered, we've sent a link to reset your password. It expires in 30 minutes."
              : "Enter the email linked to your account and we'll send you a link to reset your password."}
          </p>

          {!isForgotSubmitted && (
            <form onSubmit={handleForgotSubmit} className="login-form">
              <label htmlFor="forgotEmail">Email address</label>
              <div className="input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="forgotEmail"
                  name="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? 'Sending link...' : 'Send reset link'}
                {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </form>
          )}

          <p className="account-switch">
            <button type="button" onClick={resetForgotState}>
              <ArrowLeft size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Back to sign in
            </button>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <div className="auth-decoration decoration-one" />
      <div className="auth-decoration decoration-two" />
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark">P</div>
        <p className="eyebrow">PeoplePay360</p>
        <h1 id="login-title">{isRegistering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="intro">{isRegistering ? 'Set up your PeoplePay360 workspace access.' : 'Sign in to manage your people and payroll workspace.'}</p>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegistering && (
            <>
              <label htmlFor="name">Full name</label>
              <div className="input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </div>
            </>
          )}

          <label htmlFor="email">Email address</label>
          <div className="input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="password-label-row">
            <label htmlFor="password">Password</label>
            {!isRegistering && <button type="button" className="forgot-button" onClick={() => setIsForgotPassword(true)}>Forgot password?</button>}
          </div>
          <div className="input-wrap">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={updateField}
              placeholder="Enter your password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
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

          {isRegistering && (
            <>
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={updateField}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create account' : 'Sign in')}
            {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        </form>

        <p className="account-switch">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => setIsRegistering((registering) => !registering)}>
            {isRegistering ? 'Sign in' : 'Sign up'}
          </button>
        </p>
        <p className="security-note">Secure access for your HR and payroll team</p>
      </section>
    </main>
  )
}

export default Login