import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createContract, deleteContract, getContracts, updateContract } from '../services/contractService'
import Pagination from '../components/Pagination'
import { getStoredUser } from '../services/authService'

const emptyContract = { employeeId: '', startDate: '', endDate: '', department: '', position: '', wage: '', salaryStructureId: '', status: 'Active' }

function ContractManagement() {
  const [contracts, setContracts] = useState([])
  const [form, setForm] = useState(emptyContract)
  const [editingId, setEditingId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const currentUser = getStoredUser()
  const isPayrollUser = currentUser?.role === 'HR Payroll User'
  const isAdmin = currentUser?.role === 'Admin'

  const loadContracts = async () => {
    try { setContracts(await getContracts()) } catch (error) { toast.error(error.response?.data?.message || 'Unable to load contracts') } finally { setIsLoading(false) }
  }
  useEffect(() => { loadContracts() }, [])
  const pageSize = 10
  const paginatedContracts = contracts.slice((page - 1) * pageSize, page * pageSize)
  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const startCreate = () => { setForm(emptyContract); setEditingId(null); setIsFormOpen(true) }
  const startEdit = (contract) => { setForm({ ...contract, startDate: contract.startDate?.slice(0, 10), endDate: contract.endDate?.slice(0, 10) || '', editReason: '' }); setEditingId(contract._id); setIsFormOpen(true) }
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isAdmin && editingId && form.editReason.trim().length < 10) {
      toast.error('Please provide a valid reason of at least 10 characters for this edit')
      return
    }
    try { if (editingId) await updateContract(editingId, form); else await createContract(form); toast.success(editingId ? 'Contract updated' : 'Contract created'); setIsFormOpen(false); await loadContracts() } catch (error) { toast.error(error.response?.data?.message || 'Unable to save contract') }
  }
  const handleDelete = async (contract) => {
    if (!window.confirm(`Delete contract for ${contract.employeeId}?`)) return
    try { await deleteContract(contract._id); toast.success('Contract deleted'); await loadContracts() } catch (error) { toast.error(error.response?.data?.message || 'Unable to delete contract') }
  }

  return <div className="contract-management">
    <div className="employee-toolbar"><p className="module-note">Historical contracts determine the wage and structure used for a payroll period.</p>{!isPayrollUser && <button type="button" className="primary-action" onClick={startCreate}><Plus size={17} aria-hidden="true" /> New contract</button>}</div>
    {isFormOpen && <form className="employee-form" onSubmit={handleSubmit}><div className="form-heading"><h2>{editingId ? 'Edit contract' : 'New contract'}</h2><button type="button" className="back-link" onClick={() => setIsFormOpen(false)}>Cancel</button></div><div className="employee-form-grid">
      {['employeeId', 'department', 'position', 'salaryStructureId'].map((name) => <label key={name}>{name === 'employeeId' ? 'Employee ID' : name === 'salaryStructureId' ? 'Salary structure ID' : name[0].toUpperCase() + name.slice(1)}<input name={name} value={form[name]} onChange={updateField} required={['employeeId', 'department', 'position'].includes(name)} /></label>)}
      <label>Start date<input name="startDate" type="date" value={form.startDate} onChange={updateField} required /></label><label>End date<input name="endDate" type="date" value={form.endDate} onChange={updateField} /></label><label>Wage<input name="wage" type="number" min="0" step="0.01" value={form.wage} onChange={updateField} required /></label><label>Status<select name="status" value={form.status} onChange={updateField}><option>Draft</option><option>Active</option><option>Expired</option><option>Cancelled</option></select></label>
      {isAdmin && editingId && <label className="employee-form-grid-full">Reason for edit<textarea name="editReason" value={form.editReason || ''} onChange={updateField} placeholder="Explain why this contract is being changed" required minLength={10} rows={3} /></label>}
    </div><button type="submit" className="primary-action">{editingId ? 'Save changes' : 'Create contract'}</button></form>}
    <div className="employee-table-wrap"><table className="employee-table"><thead><tr><th>Employee</th><th>Period</th><th>Department</th><th>Position</th><th>Wage</th><th>Status</th>{!isPayrollUser && <th>Actions</th>}</tr></thead><tbody>{isLoading ? <tr><td colSpan={isPayrollUser ? 6 : 7} className="empty-state">Loading contracts...</td></tr> : contracts.length === 0 ? <tr><td colSpan={isPayrollUser ? 6 : 7} className="empty-state">No contracts found.</td></tr> : paginatedContracts.map((contract) => <tr key={contract._id}><td className="employee-id">{contract.employeeId}</td><td>{contract.startDate?.slice(0, 10)} → {contract.endDate?.slice(0, 10) || 'Present'}</td><td>{contract.department}</td><td>{contract.position}</td><td>₹{Number(contract.wage).toLocaleString('en-IN')}</td><td><span className={`status-badge status-${contract.status.toLowerCase()}`}>{contract.status}</span></td>{!isPayrollUser && <td><div className="row-actions"><button type="button" className="table-action" onClick={() => startEdit(contract)}><Pencil size={15} aria-hidden="true" /> Edit</button><button type="button" className="table-action danger" onClick={() => handleDelete(contract)}><Trash2 size={15} aria-hidden="true" /> Delete</button></div></td>}</tr>)}</tbody></table></div>
    <Pagination page={page} pageSize={pageSize} total={contracts.length} onPageChange={setPage} />
  </div>
}

export default ContractManagement