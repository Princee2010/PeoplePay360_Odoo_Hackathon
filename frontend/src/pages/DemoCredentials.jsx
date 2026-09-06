import { Copy, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'

const credentials = [
  { role: 'HR Manager', email: 'hr.manager@demo.peoplepay360.com', password: 'Demo@123456' },
  { role: 'HR Payroll User', email: 'hr.payroll.user@demo.peoplepay360.com', password: 'Demo@123456' },
  { role: 'HR Payroll Manager', email: 'hr.payroll.manager@demo.peoplepay360.com', password: 'Demo@123456' },
  { role: 'Admin', email: 'admin@demo.peoplepay360.com', password: 'Demo@123456' },
]

async function copyCredential(value, label) {
  await navigator.clipboard.writeText(value)
  toast.success(`${label} copied`)
}

function DemoCredentials() {
  return (
    <main className="credentials-page">
      <section className="credentials-card">
        <div className="credentials-heading">
          <div className="brand-mark">P</div>
          <p className="eyebrow">PeoplePay360</p>
          <h1>Demo access</h1>
          <p>Use these accounts to explore each role in the workspace.</p>
        </div>
        <div className="credentials-table-wrap">
          <table className="credentials-table">
            <thead><tr><th>Role</th><th>Email</th><th>Password</th><th aria-label="Copy actions" /></tr></thead>
            <tbody>{credentials.map((credential) => <tr key={credential.email}><td><strong>{credential.role}</strong></td><td><code>{credential.email}</code></td><td><code>{credential.password}</code></td><td><button type="button" className="credential-copy" onClick={() => copyCredential(`${credential.email}\n${credential.password}`, 'Credentials')} aria-label={`Copy ${credential.role} credentials`}><Copy size={16} /></button></td></tr>)}</tbody>
          </table>
        </div>
        <div className="credentials-footer"><KeyRound size={16} aria-hidden="true" /><span>All demo accounts use the same password shown above.</span></div>
      </section>
    </main>
  )
}

export default DemoCredentials
