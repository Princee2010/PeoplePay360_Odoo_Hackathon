import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createAttendance, getAttendanceList } from '../services/attendanceService'
import { getEmployees } from '../services/employeeService'
import { getStoredUser } from '../services/authService'
import Pagination from '../components/Pagination'

const emptyAttendance = {
  employeeId: '',
  date: '',
  checkIn: '',
  checkOut: '',
  status: '',
  remarks: '',
}

const today = new Date().toISOString().slice(0, 10)

function AttendanceManagement() {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(emptyAttendance)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [page, setPage] = useState(1)
  const currentUser = getStoredUser()
  const isPersonalView = currentUser?.role === 'Employee'
  const isAdmin = currentUser?.role === 'Admin'
  const isHrPayrollUser = currentUser?.role === 'HR Payroll User'
  const isHrPayrollManager = currentUser?.role === 'HR Payroll Manager'

  const sessionEmployee = currentUser?.employee
  const sessionEmployeeId = sessionEmployee?.employeeId || ''

  const loadAttendance = async () => {
    try {
      const data = await getAttendanceList({ date: selectedDate })
      setRecords(data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load attendance')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getEmployees().then((loadedEmployees) => {
      const personalEmployees = isPersonalView && sessionEmployee && loadedEmployees.length === 0 ? [sessionEmployee] : loadedEmployees
      setEmployees(personalEmployees)
      if (isPersonalView && personalEmployees[0]) {
        setForm((current) => ({ ...current, employeeId: personalEmployees[0].employeeId }))
      }
    }).catch((error) => toast.error(error.response?.data?.message || 'Unable to load employees'))
    loadAttendance()
  }, [selectedDate, isPersonalView, sessionEmployeeId])

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const startCreate = () => {
    if (hasMarkedAttendanceToday) return
    setForm({ ...emptyAttendance, date: selectedDate })
    setIsFormOpen(true)
  }

  const formattedRecords = useMemo(() => records.map((record) => ({
    ...record,
    workedHours: Number(record.workedHours || 0).toFixed(2),
    dateLabel: record.date ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—',
  })), [records])
  const pageSize = 10
  const paginatedRecords = formattedRecords.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    setPage(1)
  }, [selectedDate])

  const hasMarkedAttendanceToday = isPersonalView
    ? records.length > 0
    : false

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      await createAttendance(form)
      toast.success('Attendance recorded')

      setIsFormOpen(false)
      await loadAttendance()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save attendance')
    }
  }

  return (
    <div className="contract-management">
      <div className="employee-toolbar">
        <p className="module-note">Attendance entries include check-in, check-out, worked hours, and status flags for manual review.</p>
        {!isAdmin && !isHrPayrollUser && !isHrPayrollManager && <button
          type="button"
          className={`primary-action${hasMarkedAttendanceToday ? ' is-disabled' : ''}`}
          onClick={startCreate}
          disabled={hasMarkedAttendanceToday}
          title={hasMarkedAttendanceToday ? 'You have already marked attendance' : 'Add attendance'}
        >
          {hasMarkedAttendanceToday ? (
            <>
              <CheckCircle2 size={17} aria-hidden="true" /> Attendance marked
            </>
          ) : (
            <>
              <Plus size={17} aria-hidden="true" /> Add attendance
            </>
          )}
        </button>}
      </div>

      {isFormOpen && (
        <form className="employee-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h2>Add attendance record</h2>
            <button type="button" className="back-link" onClick={() => setIsFormOpen(false)}>Cancel</button>
          </div>
          <div className="employee-form-grid">
            {isPersonalView ? <div className="attendance-employee-display"><span>Employee</span><strong>{employees[0] ? `${employees[0].employeeId} · ${employees[0].firstName} ${employees[0].lastName}` : 'Loading employee...'}</strong></div> : <label>Employee<select name="employeeId" value={form.employeeId} onChange={updateField} required><option value="">Select registered employee</option>{employees.map((employee) => <option key={employee._id} value={employee.employeeId}>{employee.employeeId} · {employee.firstName} {employee.lastName}</option>)}</select></label>}
            {isPersonalView ? <div className="attendance-employee-display"><span>Date</span><strong>{new Date(`${form.date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div> : <label>Date<input name="date" type="date" value={form.date} onChange={updateField} required /></label>}
            <label>
              Check in
              <input name="checkIn" type="time" value={form.checkIn} onChange={updateField} />
            </label>
            <label>
              Check out
              <input name="checkOut" type="time" value={form.checkOut} onChange={updateField} />
            </label>
            <div className="attendance-auto-note"><strong>Status and remarks are automatic</strong><span>Based on check-in, check-out, and worked hours.</span></div>
          </div>
          <button type="submit" className="primary-action">Create record</button>
        </form>
      )}

      <div className="attendance-date-filter"><CalendarDays size={17} aria-hidden="true" /><label>Showing attendance for {isPersonalView ? <strong>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> : <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />}</label></div>
      <div className="employee-table-wrap">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Worked Hours</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="empty-state">Loading attendance...</td></tr>
            ) : formattedRecords.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No attendance records found.</td></tr>
            ) : paginatedRecords.map((record) => (
              <tr key={record._id}>
                <td className="employee-id">{record.employeeId}</td>
                <td>{record.dateLabel}</td>
                <td>{record.checkIn || '—'}</td>
                <td>{record.checkOut || '—'}</td>
                <td>{record.workedHours}</td>
                <td><span className={`status-badge status-${record.status.toLowerCase().replace(/\s+/g, '-')}`}>{record.status}</span></td>
                <td>{record.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={formattedRecords.length} onPageChange={setPage} />
    </div>
  )
}

export default AttendanceManagement
