import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleDollarSign, Download, Printer, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEmployees } from '../services/employeeService'
import { computePayrun, createPayrun, downloadPayslip, getPayrunWarnings, getPayruns, markPayrunPaid, previewPayroll, printPayslip, sendPayrunPayslips, validatePayrun } from '../services/payrollService'
import { getSalaryStructures } from '../services/salaryService'
import { getStoredUser } from '../services/authService'

function PayrollManagement() {
  const [employees, setEmployees] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [selectedContract, setSelectedContract] = useState(null)
    const [calculation, setCalculation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [salaryStructures, setSalaryStructures] = useState([])
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardStructureId, setWizardStructureId] = useState('')
  const [eligibleEmployeeIds, setEligibleEmployeeIds] = useState([])
  const [isCreatingPayrun, setIsCreatingPayrun] = useState(false)
  const [payruns, setPayruns] = useState([])
  const [payrunWarnings, setPayrunWarnings] = useState({})
  const [payrollSection, setPayrollSection] = useState('new')
  const currentUser = getStoredUser()
  const isPayrollManager = ['HR Payroll Manager', 'Admin'].includes(currentUser?.role)

  useEffect(() => {
    Promise.all([getEmployees(), getSalaryStructures(), getPayruns()]).then(([loadedEmployees, loadedStructures, loadedPayruns]) => {
      setEmployees(loadedEmployees)
      setSalaryStructures(loadedStructures)
      setPayruns(loadedPayruns)
      setEligibleEmployeeIds(loadedEmployees.filter((record) => record.status !== 'Inactive').map((record) => record.employeeId))
    }).catch((error) => {
      toast.error(error.response?.data?.message || 'Unable to load payroll options')
    })
  }, [])

  const startPayrun = () => {
    setWizardStep(1)
    setWizardStructureId(salaryStructures[0]?._id || '')
    setEligibleEmployeeIds(employees.filter((record) => record.status !== 'Inactive').map((record) => record.employeeId))
  }

  const continuePayrun = (event) => {
    event.preventDefault()
    if (!wizardStructureId) { toast.error('Select a salary structure'); return }
    setWizardStep(2)
  }

  const toggleEligibleEmployee = (employeeId) => setEligibleEmployeeIds((current) => current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId])

  const submitPayrun = async (event) => {
    event.preventDefault()
    if (!eligibleEmployeeIds.length) { toast.error('Select at least one eligible employee'); return }
    setIsCreatingPayrun(true)
    try {
      const result = await createPayrun({ period, salaryStructureId: wizardStructureId, employeeIds: eligibleEmployeeIds })
      toast.success(`Payrun created with ${result.payslips.length} payslips`)
      setWizardStep(0)
      setPayruns(await getPayruns())
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to create payrun') } finally { setIsCreatingPayrun(false) }
  }

  const selectContract = async (event) => {
    event.preventDefault()
    if (!employeeId) {
      toast.error('Select an employee first')
      return
    }

    setIsLoading(true)
    setSelectedContract(null)
    setCalculation(null)
    try {
      const preview = await previewPayroll(employeeId, period)
      setSelectedContract(preview.contract)
      setCalculation(preview)
    } catch (error) {
      toast.error(error.response?.data?.message || 'No contract applies to this period')
    } finally {
      setIsLoading(false)
    }
  }

  const employee = employees.find((record) => record.employeeId === employeeId)

  const latestPayrun = payruns[0]
  const payrollOverview = useMemo(() => {
    const payslips = latestPayrun?.payslips || []
    return {
      payslips,
      gross: payslips.reduce((total, payslip) => total + Number(payslip.grossSalary || 0), 0),
      deductions: payslips.reduce((total, payslip) => total + Number(payslip.totalDeductions || 0), 0),
      net: payslips.reduce((total, payslip) => total + Number(payslip.netSalary || 0), 0),
    }
  }, [latestPayrun])

  const formatMoney = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`

  const getEmployeeName = (employeeCode) => {
    const record = employees.find((item) => item.employeeId === employeeCode)
    return record ? `${record.firstName} ${record.lastName}` : employeeCode
  }

  const downloadEmployeePayroll = () => {
    if (!payrollOverview.payslips.length) return
    const rows = [
      ['Employee ID', 'Employee name', 'Gross salary', 'Deductions', 'Net salary'],
      ...payrollOverview.payslips.map((payslip) => [payslip.employeeId, getEmployeeName(payslip.employeeId), payslip.grossSalary, payslip.totalDeductions, payslip.netSalary]),
    ]
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = `payroll-${latestPayrun.period}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const printEmployeePayroll = () => {
    if (!latestPayrun?.payslips?.length) return
    const rows = latestPayrun.payslips.map((payslip) => `<tr><td>${payslip.employeeId}</td><td>${getEmployeeName(payslip.employeeId)}</td><td>${formatMoney(payslip.grossSalary)}</td><td>${formatMoney(payslip.totalDeductions)}</td><td>${formatMoney(payslip.netSalary)}</td></tr>`).join('')
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return
    printWindow.document.write(`<html><head><title>Payroll ${latestPayrun.period}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#172735}h1{font-size:22px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #dfe4e9;text-align:left}th{background:#edf2f7;font-size:12px}</style></head><body><h1>Employee Payroll - ${latestPayrun.period}</h1><table><thead><tr><th>Employee ID</th><th>Name</th><th>Gross</th><th>Deductions</th><th>Net salary</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    printWindow.document.close()
    printWindow.print()
  }

  const processPayrun = async (payrun, action, successMessage) => {
    try {
      const result = await ({ compute: computePayrun, validate: validatePayrun, paid: markPayrunPaid, send: sendPayrunPayslips }[action])(payrun._id)
      toast.success(successMessage)
      setPayruns((current) => current.map((record) => record._id === payrun._id ? result.payrun : record))
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to update payrun') }
  }

  const reviewWarnings = async (payrun) => {
    try {
      const warnings = await getPayrunWarnings(payrun._id)
      setPayrunWarnings((current) => ({ ...current, [payrun._id]: warnings }))
      if (!warnings.length) await processPayrun(payrun, 'validate', 'Payrun validated')
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to check payroll warnings') }
  }

  const handleDownloadPayslip = async (payrun, payslip) => {
    try { await downloadPayslip(payrun._id, payslip._id); toast.success('Payslip downloaded') } catch (error) { toast.error(error.response?.data?.message || 'Unable to download payslip') }
  }

  const handlePrintPayslip = async (payrun, payslip) => {
    try { await printPayslip(payrun._id, payslip._id) } catch (error) { toast.error(error.response?.data?.message || error.message || 'Unable to print payslip') }
  }

  return (
    <div className={`payroll-management payroll-section-${payrollSection}`}>
      <div className="payroll-tabs" role="tablist" aria-label="Payroll sections">
        {[['new', 'New Payrun'], ['employees', 'All Employee Data'], ['preview', 'Preview Payroll Contract']].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={payrollSection === key} className={payrollSection === key ? 'active' : ''} onClick={() => setPayrollSection(key)}>{label}</button>)}
      </div>
      {payrollSection === 'new' && <section className="new-payrun-panel"><div><p className="eyebrow">Payroll processing</p><h2>Start a payroll run</h2><p>Choose the salary structure, period, and employees before generating payslips.</p></div><button type="button" className="primary-action" onClick={startPayrun}>+ New Payrun</button></section>}
      <section className={`payroll-overview payroll-tab-panel ${payrollSection === 'employees' ? 'is-active' : ''}`} aria-labelledby="payroll-overview-title">
        <div className="payroll-overview-heading">
          <div><p className="eyebrow">Admin overview</p><h2 id="payroll-overview-title">Payroll at a glance</h2><p>{latestPayrun ? `${new Date(`${latestPayrun.period}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })} payroll` : 'No payroll has been created yet.'}</p></div>
          {latestPayrun && <span className={`status-badge status-${latestPayrun.status.toLowerCase()}`}>{latestPayrun.status}</span>}
        </div>
        <div className="payroll-overview-metrics">
          <div><span>Employees</span><strong>{payrollOverview.payslips.length}</strong></div>
          <div><span>Gross payroll</span><strong>{formatMoney(payrollOverview.gross)}</strong></div>
          <div><span>Deductions</span><strong>{formatMoney(payrollOverview.deductions)}</strong></div>
          <div><span>Net payroll</span><strong>{formatMoney(payrollOverview.net)}</strong></div>
        </div>
        {latestPayrun?.payslips?.length > 0 ? <div className="payroll-overview-table-wrap"><table className="payroll-overview-table"><thead><tr><th>Employee</th><th>Gross</th><th>Deductions</th><th>Net salary</th><th>Payslip</th></tr></thead><tbody>{latestPayrun.payslips.map((payslip) => <tr key={payslip._id}><td><strong>{getEmployeeName(payslip.employeeId)}</strong><small>{payslip.employeeId}</small></td><td>{formatMoney(payslip.grossSalary)}</td><td>{formatMoney(payslip.totalDeductions)}</td><td><strong>{formatMoney(payslip.netSalary)}</strong></td><td><span className="overview-status">Ready</span></td></tr>)}</tbody></table></div> : <div className="payroll-overview-empty">Create a payrun to see every employee’s salary in one place.</div>}
        {isPayrollManager && <div className="payroll-export-actions"><button type="button" className="secondary-action" onClick={downloadEmployeePayroll} disabled={!payrollOverview.payslips.length}><Download size={16} aria-hidden="true" /> Download employee data</button><button type="button" className="secondary-action" onClick={printEmployeePayroll} disabled={!payrollOverview.payslips.length}><Printer size={16} aria-hidden="true" /> Print employee data</button></div>}
      </section>
      {wizardStep > 0 && <section className="payrun-wizard" aria-labelledby="payrun-wizard-title"><div className="payrun-wizard-heading"><div><p className="eyebrow">Step {wizardStep} of 2</p><h2 id="payrun-wizard-title">{wizardStep === 1 ? 'Choose payroll inputs' : 'Confirm eligible employees'}</h2></div><button type="button" className="icon-button" onClick={() => setWizardStep(0)} aria-label="Close payrun wizard"><X size={18} /></button></div>{wizardStep === 1 ? <form onSubmit={continuePayrun}><div className="payrun-wizard-grid"><label>Salary Structure<select value={wizardStructureId} onChange={(event) => setWizardStructureId(event.target.value)} required><option value="">Select structure</option>{salaryStructures.map((structure) => <option key={structure._id} value={structure._id}>{structure.name}</option>)}</select></label><label>Period<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} required /></label></div><button type="submit" className="primary-action">Continue</button></form> : <form onSubmit={submitPayrun}><div className="eligible-heading"><strong>Eligible Employees</strong><span>{eligibleEmployeeIds.length} selected</span></div><div className="eligible-list">{employees.filter((record) => record.status !== 'Inactive').map((record) => <label key={record._id} className="eligible-employee"><input type="checkbox" checked={eligibleEmployeeIds.includes(record.employeeId)} onChange={() => toggleEligibleEmployee(record.employeeId)} /><span>{record.firstName} {record.lastName}<small>{record.employeeId} · {record.department}</small></span></label>)}</div><div className="payrun-wizard-actions"><button type="button" className="secondary-action" onClick={() => setWizardStep(1)}>Back</button><button type="submit" className="primary-action" disabled={isCreatingPayrun}>{isCreatingPayrun ? 'Creating payrun...' : 'Create Payrun'}</button></div></form>}</section>}
      <section className="payrun-list" aria-labelledby="payrun-list-title"><div className="payrun-list-heading"><h2 id="payrun-list-title">Payruns</h2><span>{payruns.length} total</span></div>{payruns.length === 0 ? <div className="empty-state">No payruns created yet.</div> : payruns.map((payrun) => <article className="payrun-card" key={payrun._id}><div><strong>{new Date(`${payrun.period}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })} Payroll</strong><small>Employees: {payrun.payslips?.length || 0}</small></div><span className={`status-badge status-${payrun.status.toLowerCase()}`}>{payrun.status}</span><div className="payrun-actions">{payrun.status === 'Draft' && <button type="button" className="primary-action" onClick={() => processPayrun(payrun, 'compute', 'Payrun computed')}>Compute</button>}{isPayrollManager && payrun.status === 'Computed' && <button type="button" className="primary-action" onClick={() => reviewWarnings(payrun)}>Validate</button>}{isPayrollManager && payrun.status === 'Validated' && <button type="button" className="primary-action" onClick={() => processPayrun(payrun, 'paid', 'Payrun marked paid')}>Mark Paid</button>}{isPayrollManager && payrun.status === 'Paid' && <button type="button" className="primary-action" onClick={() => processPayrun(payrun, 'send', 'Payslips sent')}>Send Payslips</button>}</div>{payrunWarnings[payrun._id]?.length > 0 && <div className="payrun-warning-panel"><div className="payrun-warning-heading"><strong>⚠ Warnings</strong><span>Review before finalizing payroll</span></div><ul>{payrunWarnings[payrun._id].map((warning) => <li key={warning.type}>{warning.message}</li>)}</ul>{isPayrollManager && <button type="button" className="secondary-action" onClick={() => processPayrun(payrun, 'validate', 'Payrun validated with warnings')}>Validate anyway</button>}</div>}<div className="payrun-payslips">{payrun.payslips?.map((payslip) => <div className="payrun-payslip-row" key={payslip._id}><span><strong>{payslip.employeeId}</strong><small>Net ₹{Number(payslip.netSalary || 0).toLocaleString('en-IN')}</small></span><div className="payslip-actions"><button type="button" className="table-action" onClick={() => handlePrintPayslip(payrun, payslip)}><span aria-hidden="true">Print</span> Payslip</button><button type="button" className="table-action" onClick={() => handleDownloadPayslip(payrun, payslip)}><Download size={15} aria-hidden="true" /> Download</button></div></div>)}</div></article>)}</section>
      <section className="payroll-rule-banner">
        <div className="payroll-rule-icon"><CircleDollarSign size={23} aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">Payroll rule</p>
          <h2>Use the contract active during the payroll period</h2>
          <p>PeoplePay360 selects the latest contract covering the selected month, never simply the first contract found.</p>
        </div>
      </section>

      <form className="payroll-selector" onSubmit={selectContract}>
        <div className="form-heading"><div><p className="eyebrow">Contract selection</p><h2>Preview payroll contract</h2></div><Search size={20} aria-hidden="true" /></div>
        <div className="payroll-selector-grid">
          <label>Employee<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required><option value="">Choose employee</option>{employees.map((record) => <option key={record._id} value={record.employeeId}>{record.employeeId} · {record.firstName} {record.lastName}</option>)}</select></label>
          <label>Payroll period<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} required /></label>
        </div>
        <button type="submit" className="primary-action" disabled={isLoading}>{isLoading ? 'Selecting contract...' : 'Select applicable contract'}</button>
      </form>

      {selectedContract && (
        <section className="selected-contract" aria-live="polite">
          <div className="selected-contract-heading"><div><p className="eyebrow">Selected for {period}</p><h2>Contract selected</h2></div><CheckCircle2 size={25} aria-label="Contract selected" /></div>
          <div className="selected-contract-grid">
            <div><span>Employee</span><strong>{employee?.firstName} {employee?.lastName} <small>({employeeId})</small></strong></div>
            <div><span>Contract period</span><strong>{selectedContract.startDate?.slice(0, 10)} → {selectedContract.endDate?.slice(0, 10) || 'Present'}</strong></div>
            <div><span>Salary used</span><strong>₹{Number(selectedContract.wage).toLocaleString('en-IN')}</strong></div>
            <div><span>Position</span><strong>{selectedContract.position}</strong></div>
          </div>
          {calculation && <div className="payroll-calculation"><div className="payroll-calculation-heading"><h3>Salary rule calculation</h3><span>{calculation.structure.name}</span></div><div className="payroll-lines">{calculation.lines.map((line) => <div className="payroll-line" key={line.code}><span><strong>{line.name}</strong><small>{line.code} · {line.category}</small></span><strong>₹{Number(line.amount).toLocaleString('en-IN')}</strong></div>)}</div><div className="payroll-total-row"><span>Gross salary</span><strong>₹{Number(calculation.grossSalary).toLocaleString('en-IN')}</strong></div><div className="payroll-total-row deduction"><span>Total deductions</span><strong>− ₹{Number(calculation.totalDeductions).toLocaleString('en-IN')}</strong></div><div className="payroll-net-row"><span>Net salary</span><strong>₹{Number(calculation.netSalary).toLocaleString('en-IN')}</strong></div></div>}
          <p className="selection-proof">This contract and salary structure were selected by the backend for the payroll period.</p>
        </section>
      )}
    </div>
  )
}

export default PayrollManagement
