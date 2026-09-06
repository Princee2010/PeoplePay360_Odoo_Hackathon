import { useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createAllocation, createLeaveRequest, getAllocations, getLeaveOptions, getLeaveRequests, updateLeaveRequestStatus } from '../services/leaveService'
import { getStoredUser } from '../services/authService'
import Pagination from '../components/Pagination'

const tabs = ['Requests', 'Allocations']
const emptyRequest = { employeeId: '', leaveTypeId: '', fromDate: '', toDate: '', reason: '' }

function employeeName(employee) { return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown employee' }
function TimeOffManagement() {
  const [tab, setTab] = useState('Requests')
  const [options, setOptions] = useState({ employees: [], leaveTypes: [] })
  const [requests, setRequests] = useState([])
  const [allocations, setAllocations] = useState([])
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false)
  const [requestForm, setRequestForm] = useState(emptyRequest)
  const [isAllocationFormOpen, setIsAllocationFormOpen] = useState(false)
  const [allocationForm, setAllocationForm] = useState({ employeeId: '', leaveTypeId: '', year: new Date().getFullYear(), allocatedDays: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [requestPage, setRequestPage] = useState(1)
  const [allocationPage, setAllocationPage] = useState(1)
  const currentUser = getStoredUser()
  const isPersonalView = currentUser?.role === 'Employee'
  const isAdmin = currentUser?.role === 'Admin'
  const isHrPayrollUser = currentUser?.role === 'HR Payroll User'
  const visibleTabs = isPersonalView || currentUser?.role === 'HR Manager' ? ['Requests', 'Allocations'] : ['Allocations']
  const canRequest = isPersonalView
  const canCreateAllocation = ['HR Payroll User', 'HR Payroll Manager', 'Admin'].includes(currentUser?.role)

  const load = async () => {
    try {
      if (isAdmin || isHrPayrollUser) setTab('Allocations')
      const [loadedOptions, loadedRequests, loadedAllocations] = await Promise.all([getLeaveOptions(), isPersonalView || currentUser?.role === 'HR Manager' ? getLeaveRequests() : Promise.resolve([]), isPersonalView ? Promise.resolve([]) : getAllocations()])
      setOptions({ ...loadedOptions, leaveTypes: loadedOptions.leaveTypes.filter((type) => ['Home', 'Sick', 'Other'].includes(type.name)) }); setRequests(loadedRequests); setAllocations(loadedAllocations)
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to load time off') } finally { setIsLoading(false) }
  }
  useEffect(() => { load() }, [isAdmin])
  const updateRequest = (event) => {
    const { name, value } = event.target
    if (name === 'leaveTypeId') {
      const selectedType = options.leaveTypes.find((type) => type._id === value)
      setRequestForm((current) => ({
        ...current,
        leaveTypeId: value,
        reason: selectedType?.name === 'Sick' ? 'Sick Leave' : current.reason,
      }))
      return
    }
    setRequestForm((current) => ({ ...current, [name]: value }))
  }
  const submitRequest = async (event) => { event.preventDefault(); try { await createLeaveRequest(requestForm); toast.success('Time off request created'); setIsRequestFormOpen(false); setRequestForm(emptyRequest); await load() } catch (error) { toast.error(error.response?.data?.message || 'Unable to create request') } }
  const submitAllocation = async (event) => { event.preventDefault(); try { await createAllocation(allocationForm); toast.success('Allocation created'); setIsAllocationFormOpen(false); setAllocationForm({ employeeId: '', leaveTypeId: '', year: new Date().getFullYear(), allocatedDays: '' }); await load() } catch (error) { toast.error(error.response?.data?.message || 'Unable to create allocation') } }
  const decide = async (request, status) => {
    const decisionNote = window.prompt(`${status} note (optional)`, '')
    if (decisionNote === null) return
    try { await updateLeaveRequestStatus(request._id, status, decisionNote); toast.success(`Request ${status.toLowerCase()}`); await load() } catch (error) { toast.error(error.response?.data?.message || 'Unable to update request') }
  }

  const pendingCount = requests.filter((request) => request.status === 'Pending').length
  const pageSize = 10
  const paginatedRequests = requests.slice((requestPage - 1) * pageSize, requestPage * pageSize)
  const paginatedAllocations = allocations.slice((allocationPage - 1) * pageSize, allocationPage * pageSize)

  return <div className="time-off-management">
    <div className="time-off-toolbar"><div className="time-off-tabs">{visibleTabs.map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>{tab === 'Requests' && canRequest && <button type="button" className="primary-action" onClick={() => setIsRequestFormOpen(true)}><Plus size={17} aria-hidden="true" /> New request</button>}{tab === 'Allocations' && canCreateAllocation && <button type="button" className="primary-action" onClick={() => setIsAllocationFormOpen(true)}><Plus size={17} aria-hidden="true" /> New allocation</button>}</div>
    {tab === 'Requests' && <>
      <div className="approval-banner"><div><strong>{pendingCount} pending approval{pendingCount === 1 ? '' : 's'}</strong><span>HR managers can approve requests to deduct leave days from the employee balance.</span></div><span className="approval-step">Pending → Approve / Reject</span></div>
      {isRequestFormOpen && <form className="employee-form" onSubmit={submitRequest}><div className="form-heading"><h2>New time off request</h2><button type="button" className="back-link" onClick={() => setIsRequestFormOpen(false)}>Cancel</button></div><div className="employee-form-grid">{isPersonalView ? <div className="attendance-employee-display"><span>Employee</span><strong>{employeeName(options.employees[0])}</strong></div> : <label>Employee<select name="employeeId" value={requestForm.employeeId} onChange={updateRequest} required><option value="">Select employee</option>{options.employees.map((employee) => <option value={employee._id} key={employee._id}>{employeeName(employee)}</option>)}</select></label>}<label>Leave type<select name="leaveTypeId" value={requestForm.leaveTypeId} onChange={updateRequest} required><option value="">Select type</option>{options.leaveTypes.map((type) => <option value={type._id} key={type._id}>{type.name}{type.name === 'Sick' ? ' (365/366 days per year)' : ' (25 days/year)'}</option>)}</select></label><label>From<input name="fromDate" type="date" value={requestForm.fromDate} onChange={updateRequest} required /></label><label>To<input name="toDate" type="date" value={requestForm.toDate} onChange={updateRequest} required /></label><label>Reason<input name="reason" value={requestForm.reason} onChange={updateRequest} /></label></div><button className="primary-action" type="submit">Create request</button></form>}
      <div className="employee-table-wrap"><table className="employee-table"><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th>{!isPersonalView && <th>Decision</th>}</tr></thead><tbody>{isLoading ? <tr><td colSpan={isPersonalView ? 5 : 6} className="empty-state">Loading requests...</td></tr> : requests.length === 0 ? <tr><td colSpan={isPersonalView ? 5 : 6} className="empty-state">No time off requests found.</td></tr> : paginatedRequests.map((request) => <tr key={request._id}><td><strong>{employeeName(request.employeeId)}</strong><small>{request.employeeId?.employeeId}</small></td><td>{request.leaveTypeId?.name}</td><td>{request.fromDate?.slice(0, 10)} → {request.toDate?.slice(0, 10)}</td><td>{request.days}</td><td><span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span>{request.decisionNote && <small>{request.decisionNote}</small>}</td>{!isPersonalView && <td>{request.status === 'Pending' ? <div className="row-actions"><button className="table-action" type="button" onClick={() => decide(request, 'Approved')}><Check size={15} aria-hidden="true" /> Approve</button><button className="table-action danger" type="button" onClick={() => decide(request, 'Rejected')}><X size={15} aria-hidden="true" /> Reject</button></div> : <small>{request.decidedAt ? `Decided ${request.decidedAt.slice(0, 10)}` : '—'}</small>}</td>}</tr>)}</tbody></table></div>
      <Pagination page={requestPage} pageSize={pageSize} total={requests.length} onPageChange={setRequestPage} />
    </>}
    {tab === 'Allocations' && <>{isAllocationFormOpen && <form className="employee-form" onSubmit={submitAllocation}><div className="form-heading"><h2>New allocation</h2><button type="button" className="back-link" onClick={() => setIsAllocationFormOpen(false)}>Cancel</button></div><div className="employee-form-grid"><label>Employee<select name="employeeId" value={allocationForm.employeeId} onChange={(event) => setAllocationForm((current) => ({ ...current, employeeId: event.target.value }))} required><option value="">Select employee</option>{options.employees.map((employee) => <option value={employee._id} key={employee._id}>{employeeName(employee)}</option>)}</select></label><label>Leave type<select name="leaveTypeId" value={allocationForm.leaveTypeId} onChange={(event) => setAllocationForm((current) => ({ ...current, leaveTypeId: event.target.value }))} required><option value="">Select type</option>{options.leaveTypes.map((type) => <option value={type._id} key={type._id}>{type.name}</option>)}</select></label><label>Year<input name="year" type="number" value={allocationForm.year} onChange={(event) => setAllocationForm((current) => ({ ...current, year: event.target.value }))} required /></label><label>Allocated days<input name="allocatedDays" type="number" min="0" step="0.5" value={allocationForm.allocatedDays} onChange={(event) => setAllocationForm((current) => ({ ...current, allocatedDays: event.target.value }))} required /></label></div><button className="primary-action" type="submit">Create allocation</button></form>}<div className="employee-table-wrap"><table className="employee-table"><thead><tr><th>Employee</th><th>Type</th><th>Year</th><th>Allocated</th><th>Taken</th><th>Remaining</th></tr></thead><tbody>{allocations.length === 0 ? <tr><td colSpan="6" className="empty-state">No allocations found.</td></tr> : paginatedAllocations.map((allocation) => <tr key={allocation._id}><td>{employeeName(allocation.employeeId)}</td><td>{allocation.leaveTypeId?.name}</td><td>{allocation.year}</td><td>{allocation.allocatedDays}</td><td>{allocation.takenDays}</td><td><strong>{allocation.remainingDays}</strong></td></tr>)}</tbody></table></div><Pagination page={allocationPage} pageSize={pageSize} total={allocations.length} onPageChange={setAllocationPage} /></>}
  </div>
}
export default TimeOffManagement
