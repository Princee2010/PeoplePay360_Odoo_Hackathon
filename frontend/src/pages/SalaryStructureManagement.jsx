import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  createSalaryRule,
  createSalaryStructure,
  deleteSalaryRule,
  deleteSalaryStructure,
  getSalaryRules,
  getSalaryStructures,
} from '../services/salaryService'

const emptyRule = { code: '', name: '', category: 'Basic', sequence: 1, calculationType: 'Fixed amount', value: '', formula: '' }

function SalaryStructureManagement() {
  const [structures, setStructures] = useState([])
  const [rules, setRules] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [isStructureFormOpen, setIsStructureFormOpen] = useState(false)
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false)
  const [structureForm, setStructureForm] = useState({ name: '', description: '', ruleIds: [] })
  const [ruleForm, setRuleForm] = useState(emptyRule)
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    try {
      const [loadedStructures, loadedRules] = await Promise.all([getSalaryStructures(), getSalaryRules()])
      setStructures(loadedStructures)
      setRules(loadedRules)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load salary structures')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const updateStructureField = (event) => setStructureForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const updateRuleField = (event) => setRuleForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const toggleRule = (ruleId) => setStructureForm((current) => ({ ...current, ruleIds: current.ruleIds.includes(ruleId) ? current.ruleIds.filter((id) => id !== ruleId) : [...current.ruleIds, ruleId] }))

  const submitStructure = async (event) => {
    event.preventDefault()
    try {
      await createSalaryStructure(structureForm)
      toast.success('Salary structure created')
      setStructureForm({ name: '', description: '', ruleIds: [] })
      setIsStructureFormOpen(false)
      await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to create salary structure') }
  }

  const submitRule = async (event) => {
    event.preventDefault()
    try {
      await createSalaryRule(ruleForm)
      toast.success('Salary rule created')
      setRuleForm({ ...emptyRule, sequence: rules.length + 1 })
      setIsRuleFormOpen(false)
      await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to create salary rule') }
  }

  const removeStructure = async (structure) => {
    if (!window.confirm(`Delete ${structure.name}?`)) return
    try { await deleteSalaryStructure(structure._id); toast.success('Salary structure deleted'); await load() } catch (error) { toast.error(error.response?.data?.message || 'Unable to delete structure') }
  }

  const removeRule = async (rule) => {
    if (!window.confirm(`Delete ${rule.name}?`)) return
    try { await deleteSalaryRule(rule._id); toast.success('Salary rule deleted'); await load() } catch (error) { toast.error(error.response?.data?.message || 'Unable to delete rule') }
  }

  return (
    <div className="salary-structure-management">
      <div className="salary-toolbar"><p className="module-note">Structures are ordered rule containers used to calculate gross, deductions, and net salary.</p><div className="salary-actions"><button type="button" className="secondary-action" onClick={() => setIsRuleFormOpen((open) => !open)}><Plus size={16} aria-hidden="true" /> New rule</button><button type="button" className="primary-action" onClick={() => setIsStructureFormOpen((open) => !open)}><Plus size={17} aria-hidden="true" /> New structure</button></div></div>
      {isRuleFormOpen && <form className="employee-form salary-form" onSubmit={submitRule}><div className="form-heading"><h2>New salary rule</h2><button type="button" className="back-link" onClick={() => setIsRuleFormOpen(false)}>Cancel</button></div><div className="employee-form-grid"><label>Code<input name="code" value={ruleForm.code} onChange={updateRuleField} placeholder="BASIC" required /></label><label>Name<input name="name" value={ruleForm.name} onChange={updateRuleField} placeholder="Basic Salary" required /></label><label>Category<select name="category" value={ruleForm.category} onChange={updateRuleField}><option>Basic</option><option>Allowance</option><option>Deduction</option><option>Employer Contribution</option><option>Tax</option></select></label><label>Sequence<input name="sequence" type="number" min="1" value={ruleForm.sequence} onChange={updateRuleField} required /></label><label>Calculation type<select name="calculationType" value={ruleForm.calculationType} onChange={updateRuleField}><option>Fixed amount</option><option>Percentage</option><option>Formula</option></select></label><label>Value<input name="value" type="number" min="0" step="0.01" value={ruleForm.value} onChange={updateRuleField} /></label><label>Formula<input name="formula" value={ruleForm.formula} onChange={updateRuleField} placeholder="e.g. gross * 0.12" /></label></div><button type="submit" className="primary-action">Create rule</button></form>}
      {isStructureFormOpen && <form className="employee-form salary-form" onSubmit={submitStructure}><div className="form-heading"><h2>New salary structure</h2><button type="button" className="back-link" onClick={() => setIsStructureFormOpen(false)}>Cancel</button></div><div className="employee-form-grid"><label>Structure name<input name="name" value={structureForm.name} onChange={updateStructureField} placeholder="Regular Salary" required /></label><label>Description<input name="description" value={structureForm.description} onChange={updateStructureField} placeholder="Monthly employee salary" /></label></div><fieldset className="rule-picker"><legend>Ordered salary rules</legend>{rules.length === 0 ? <p className="module-note">Create rules first, then add them to this structure.</p> : rules.map((rule) => <label key={rule._id}><input type="checkbox" checked={structureForm.ruleIds.includes(rule._id)} onChange={() => toggleRule(rule._id)} /><span>{rule.sequence}. {rule.name}</span><small>{rule.category} · {rule.calculationType}</small></label>)}</fieldset><button type="submit" className="primary-action">Create structure</button></form>}
      <div className="salary-section-heading"><h2>Salary Structures</h2><span>{structures.length} configured</span></div>
      <div className="salary-structure-list">{isLoading ? <div className="empty-state">Loading salary structures...</div> : structures.length === 0 ? <div className="empty-state">No salary structures configured.</div> : structures.map((structure) => <article className="salary-structure-card" key={structure._id}><div className="salary-structure-card-header"><button type="button" className="salary-structure-toggle" onClick={() => setExpandedId(expandedId === structure._id ? null : structure._id)}>{expandedId === structure._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}<span><strong>{structure.name}</strong><small>{structure.description || 'No description'}</small></span></button><div className="salary-card-actions"><span>{structure.ruleIds.length} rules</span><button type="button" className="icon-button danger" onClick={() => removeStructure(structure)} aria-label={`Delete ${structure.name}`}><Trash2 size={16} /></button></div></div>{expandedId === structure._id && <div className="salary-rule-list">{structure.ruleIds.length === 0 ? <p className="module-note">No rules assigned.</p> : structure.ruleIds.map((rule) => <div className="salary-rule-row" key={rule._id}><span className="rule-sequence">{rule.sequence}</span><div><strong>{rule.name}</strong><small>{rule.code} · {rule.category}</small></div><span className="rule-calculation">{rule.calculationType === 'Formula' ? rule.formula : rule.calculationType === 'Percentage' ? `${rule.value}%` : `₹${Number(rule.value || 0).toLocaleString('en-IN')}`}</span><button type="button" className="icon-button danger" onClick={() => removeRule(rule)} aria-label={`Delete ${rule.name}`}><Trash2 size={15} /></button></div>)}</div>}</article>)}</div>
      <div className="salary-section-heading"><h2>Salary Rules</h2><span>{rules.length} configured</span></div>
      <div className="employee-table-wrap salary-rule-table-wrap"><table className="employee-table salary-rule-table"><thead><tr><th>Name</th><th>Code</th><th>Category</th><th>Sequence</th><th>Calculation Type</th><th>Value</th><th>Action</th></tr></thead><tbody>{isLoading ? <tr><td colSpan="7" className="empty-state">Loading salary rules...</td></tr> : rules.length === 0 ? <tr><td colSpan="7" className="empty-state">No salary rules configured.</td></tr> : rules.map((rule) => <tr key={rule._id}><td><strong>{rule.name}</strong></td><td className="employee-id">{rule.code}</td><td>{rule.category}</td><td>{rule.sequence}</td><td>{rule.calculationType}</td><td>{rule.calculationType === 'Formula' ? rule.formula || '—' : rule.calculationType === 'Percentage' ? `${rule.value}%` : `₹${Number(rule.value || 0).toLocaleString('en-IN')}`}</td><td><button type="button" className="table-action danger" onClick={() => removeRule(rule)}><Trash2 size={15} aria-hidden="true" /> Delete</button></td></tr>)}</tbody></table></div>
    </div>
  )
}

export default SalaryStructureManagement
