import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CalendarDays, CircleDollarSign, FileText, UsersRound } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { getDashboard } from '../services/dashboardService'
import { getAttendanceList } from '../services/attendanceService'

const colors = ["#175387", "#3b7cb5", "#e0a458", "#d26464", "#7d8fc2"];
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const LUNCH_BREAK_HOURS = 1
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const toMinutes = (time) => {
  if (!time) return null
  const [hours, minutes] = String(time).split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

// Net worked hours = (check-out - check-in) minus the 1 hour lunch break
const getNetWorkedHours = (checkIn, checkOut) => {
  const checkInMinutes = toMinutes(checkIn)
  const checkOutMinutes = toMinutes(checkOut)
  if (checkInMinutes === null || checkOutMinutes === null) return 0
  const diffHours = (checkOutMinutes - checkInMinutes) / 60
  if (diffHours <= 0) return 0
  const netHours = diffHours - LUNCH_BREAK_HOURS
  return netHours > 0 ? Number(netHours.toFixed(2)) : 0
}

const summarizePeriod = (records, hourGroupLabel) => {
  const statusCounts = {}
  const hourGroups = {}
  let totalHours = 0

  records.forEach((record) => {
    statusCounts[record.status] = (statusCounts[record.status] || 0) + 1
    const netHours = getNetWorkedHours(record.checkIn, record.checkOut)
    totalHours += netHours
    if (netHours > 0) {
      const label = hourGroupLabel(new Date(record.date))
      hourGroups[label] = Number(((hourGroups[label] || 0) + netHours).toFixed(2))
    }
  })

  return {
    statusData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
    hoursData: Object.entries(hourGroups).map(([name, value]) => ({ name, value })),
    totalHours: Number(totalHours.toFixed(2)),
    totalDays: records.length,
  }
}

// Builds weekly (last 7 days), monthly (current month), and yearly (current year) insights
// from an employee's raw attendance records, with work hours excluding the 1 hour lunch break.
function buildAttendanceInsights(records) {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - 6)

  const weeklyRecords = []
  const monthlyRecords = []
  const yearlyRecords = []

  records.forEach((record) => {
    const recordDate = new Date(record.date)
    if (Number.isNaN(recordDate.getTime()) || recordDate.getFullYear() !== now.getFullYear()) return
    yearlyRecords.push(record)
    if (recordDate.getMonth() === now.getMonth()) monthlyRecords.push(record)
    if (recordDate >= startOfWeek && recordDate <= now) weeklyRecords.push(record)
  })

  return {
    weekly: summarizePeriod(weeklyRecords, (date) => WEEKDAY_LABELS[date.getDay()]),
    monthly: summarizePeriod(monthlyRecords, (date) => `Week ${Math.ceil(date.getDate() / 7)}`),
    yearly: summarizePeriod(yearlyRecords, (date) => MONTH_LABELS[date.getMonth()]),
  }
}

function MetricCard({ label, value, tone = 'green' }) {
  return <article className={`dashboard-kpi kpi-${tone}`}><div><strong>{value}</strong><span>{label}</span></div></article>
}

const periodOptions = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]

function AttendanceInsightsPanel({ attendanceRecords }) {
  const [period, setPeriod] = useState('weekly')
  const insights = useMemo(() => buildAttendanceInsights(attendanceRecords), [attendanceRecords])
  const active = insights[period]

  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-heading">
        <div><p className="eyebrow">Your activity</p><h3>Attendance & Work Hours</h3></div>
        <CalendarDays size={19} aria-hidden="true" />
      </div>
      <div className="insight-tabs">
        {periodOptions.map((option) => (
          <button key={option.key} type="button" className={period === option.key ? 'active' : ''} onClick={() => setPeriod(option.key)}>{option.label}</button>
        ))}
      </div>
      <div className="insight-chart-grid">
        <div className="insight-chart">
          <h4>Attendance · {active.totalDays} day{active.totalDays === 1 ? '' : 's'}</h4>
          {active.statusData.length === 0 ? <div className="chart-empty" style={{ height: 180 }}>No attendance recorded.</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={active.statusData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
                  {active.statusData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="insight-legend">{active.statusData.map((entry, index) => <span key={entry.name}><i style={{ background: colors[index % colors.length] }} />{entry.name}: {entry.value}</span>)}</div>
        </div>
        <div className="insight-chart">
          <h4>Work hours · {active.totalHours}h (lunch break excluded)</h4>
          {active.hoursData.length === 0 ? <div className="chart-empty" style={{ height: 180 }}>No worked hours recorded.</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={active.hoursData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
                  {active.hoursData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value} hrs`} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="insight-legend">{active.hoursData.map((entry, index) => <span key={entry.name}><i style={{ background: colors[index % colors.length] }} />{entry.name}: {entry.value}h</span>)}</div>
        </div>
      </div>
    </section>
  )
}

function SalaryTrendPanel({ salaryHistory }) {
  const history = (salaryHistory || []).map((item) => ({
    period: item.period,
    wage: Number(item.wage || 0),
    netSalary: Number(item.netSalary || 0),
  }));
  const firstWage = history[0]?.wage || 0;
  const latestWage = history.at(-1)?.wage || 0;
  const improvement = firstWage ? ((latestWage - firstWage) / firstWage) * 100 : 0;

  return (
    <section className="dashboard-panel salary-trend-panel">
      <div className="dashboard-panel-heading">
        <div><p className="eyebrow">Salary progress</p><h3>Salary improvement over time</h3></div>
        {history.length > 1 && <span className="salary-growth-badge">{improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}% wage change</span>}
      </div>
      {history.length === 0 ? <div className="chart-empty">No salary history yet.</div> : (
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={history} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
            <defs><linearGradient id="employeeSalaryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#175387" stopOpacity={0.35} /><stop offset="95%" stopColor="#175387" stopOpacity={0.03} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#e3e8ec" />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value, name) => [money(value), name === 'wage' ? 'Contract wage' : 'Net salary']} />
            <Area type="monotone" dataKey="wage" stroke="#175387" strokeWidth={3} fill="url(#employeeSalaryFill)" />
            <Area type="monotone" dataKey="netSalary" stroke="#e0a458" strokeWidth={2} fill="none" />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <div className="salary-trend-legend"><span><i className="salary-wage-dot" />Contract wage</span><span><i className="salary-net-dot" />Net salary</span></div>
    </section>
  );
}

function EmployeeDashboard({ data }) {
  const [attendanceRecords, setAttendanceRecords] = useState([])


  useEffect(() => {
    getAttendanceList().then(setAttendanceRecords).catch(() => setAttendanceRecords([]))
  }, [])

  const attendanceEntries = Array.isArray(data.attendance)
    ? data.attendance
    : Object.entries(data.attendance || {}).map(([name, count]) => ({
        _id: name,
        count,
      }));
  const attendance = attendanceEntries.reduce(
    (result, item) => ({ ...result, [item._id]: item.count }),
    {},
  );
  return (
    <div className="role-dashboard">
      <div className="role-welcome">
        <p className="eyebrow">Employee workspace</p>
        <h2>
          {data.employee
            ? `Welcome, ${data.employee.firstName}.`
            : "Complete your employee profile"}
        </h2>
        <p>Everything you need for your workday, leave, and payslips.</p>
      </div>
      <div className="dashboard-kpis role-kpis">
        <MetricCard label="Present days" value={attendance.Present || 0} />
        <MetricCard
          label="Leave balance"
          value={data.leaveBalance.reduce(
            (sum, allocation) =>
              sum + allocation.allocatedDays - allocation.takenDays,
            0,
          )}
          tone="gold"
        />
        <MetricCard
          label="Latest net salary"
          value={data.latestPayslip ? money(data.latestPayslip.netSalary) : "—"}
          tone="blue"
        />
      </div>
      <div className="role-grid">
        <section className="dashboard-panel">
          <p className="eyebrow">Leave balance</p>
          <h3>Your time off</h3>
          {data.leaveBalance.length === 0 ? (
            <p className="module-note">No leave allocations yet.</p>
          ) : (
            data.leaveBalance.map((allocation) => (
              <div className="role-list-row" key={allocation._id}>
                <span>{allocation.leaveTypeId?.name}</span>
                <strong>
                  {allocation.allocatedDays - allocation.takenDays} days
                </strong>
              </div>
            ))
          )}
        </section>
        <section className="dashboard-panel">
          <p className="eyebrow">Latest payslip</p>
          <h3>
            {data.latestPayslip ? data.latestPayslip.period : "No payslip yet"}
          </h3>
          {data.latestPayslip ? (
            <div className="payslip-highlight">
              <span>Net salary</span>
              <strong>{money(data.latestPayslip.netSalary)}</strong>
              <small>Gross {money(data.latestPayslip.grossSalary)}</small>
            </div>
          ) : (
            <p className="module-note">Your latest payslip will appear here.</p>
          )}
        </section>
      </div>
      <AttendanceInsightsPanel attendanceRecords={attendanceRecords} />
      <SalaryTrendPanel salaryHistory={data.salaryHistory} />
      <section className="dashboard-panel">
        <p className="eyebrow">Requests</p>
        <h3>Recent leave requests</h3>
        {data.leaveRequests.length === 0 ? (
          <p className="module-note">No leave requests yet.</p>
        ) : (
          data.leaveRequests.map((request) => (
            <div className="role-list-row" key={request._id}>
              <span>
                {request.leaveTypeId?.name} · {request.days} days
              </span>
              <span
                className={`status-badge status-${request.status.toLowerCase()}`}
              >
                {request.status}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
/*
    : Object.entries(data.attendance || {}).map(([name, count]) => ({ _id: name, count }))
  const attendance = attendanceEntries.reduce((result, item) => ({ ...result, [item._id]: item.count }), {})
  return <div className="role-dashboard"><div className="role-welcome"><p className="eyebrow">Employee workspace</p><h2>{data.employee ? `Welcome, ${data.employee.firstName}.` : 'Complete your employee profile'}</h2><p>Everything you need for your workday, leave, and payslips.</p></div><div className="dashboard-kpis role-kpis"><MetricCard label="Present days" value={attendance.Present || 0} /><MetricCard label="Leave balance" value={data.leaveBalance.reduce((sum, allocation) => sum + allocation.allocatedDays - allocation.takenDays, 0)} tone="gold" /><MetricCard label="Latest net salary" value={data.latestPayslip ? money(data.latestPayslip.netSalary) : '—'} tone="blue" /></div><div className="role-grid"><section className="dashboard-panel"><p className="eyebrow">Leave balance</p><h3>Your time off</h3>{data.leaveBalance.length === 0 ? <p className="module-note">No leave allocations yet.</p> : data.leaveBalance.map((allocation) => <div className="role-list-row" key={allocation._id}><span>{allocation.leaveTypeId?.name}</span><strong>{allocation.allocatedDays - allocation.takenDays} days</strong></div>)}</section><section className="dashboard-panel"><p className="eyebrow">Latest payslip</p><h3>{data.latestPayslip ? data.latestPayslip.period : 'No payslip yet'}</h3>{data.latestPayslip ? <div className="payslip-highlight"><span>Net salary</span><strong>{money(data.latestPayslip.netSalary)}</strong><small>Gross {money(data.latestPayslip.grossSalary)}</small></div> : <p className="module-note">Your latest payslip will appear here.</p>}</section></div><AttendanceInsightsPanel attendanceRecords={attendanceRecords} /><section className="dashboard-panel"><p className="eyebrow">Requests</p><h3>Recent leave requests</h3>{data.leaveRequests.length === 0 ? <p className="module-note">No leave requests yet.</p> : data.leaveRequests.map((request) => <div className="role-list-row" key={request._id}><span>{request.leaveTypeId?.name} · {request.days} days</span><span className={`status-badge status-${request.status.toLowerCase()}`}>{request.status}</span></div>)}</section></div>
}

*/
function OperationsDashboard({ data }) {
  return (
    <div className="role-dashboard">
      <div className="role-welcome">
        <p className="eyebrow">People operations</p>
        <h2>Workforce overview</h2>
        <p>Keep a clear view of people, attendance, leave, and contracts.</p>
      </div>
      <div className="dashboard-kpis role-kpis">
        <MetricCard label="Active employees" value={data.kpis.employees} />
        <MetricCard
          label="Pending leave"
          value={data.leave.pendingRequests}
          tone="gold"
        />
        <MetricCard
          label="Contracts"
          value={data.contractStatus.reduce((sum, item) => sum + item.count, 0)}
          tone="blue"
        />
        <MetricCard
          label="New joiners"
          value={data.newJoiners.length}
          tone="red"
        />
      </div>
      <div className="role-grid">
        <section className="dashboard-panel">
          <p className="eyebrow">Contract status</p>
          <h3>Employment coverage</h3>
          {data.contractStatus.map((item) => (
            <div className="role-list-row" key={item._id}>
              <span>{item._id}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="dashboard-panel">
        <p className="eyebrow">New joiners</p>
        <h3>Last three months</h3>
        {data.newJoiners.map((employee) => (
          <div className="role-list-row" key={employee._id}>
            <span>
              {employee.firstName} {employee.lastName}
              <small>{employee.department}</small>
            </span>
            <strong>{employee.joiningDate.slice(0, 10)}</strong>
          </div>
        ))}
      </section>
      <PayrollAnalytics data={data} />
      <AttendanceAnalytics analytics={data.attendanceAnalytics} />
    </div>
  );
}

const STATUS_COLORS = {
  Present: "#175387",
  Late: "#e0a458",
  Absent: "#d26464",
  Overtime: "#7d8fc2",
  "Missing Checkout": "#9b78b8",
};
const STATUS_KEYS = ["Present", "Late", "Absent", "Overtime", "Missing Checkout"];

// Collapse an array of {day/month, Present, Late, ...} rows into a single pie dataset
function aggregateToPie(rows) {
  const totals = {};
  for (const row of rows) {
    for (const key of STATUS_KEYS) {
      if (row[key]) totals[key] = (totals[key] || 0) + row[key];
    }
  }
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

function AttendancePieChart({ pieData, label }) {
  if (!pieData || pieData.length === 0) {
    return <p className="module-note">No attendance data for this period.</p>;
  }
  const total = pieData.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
      <ResponsiveContainer width={220} height={220}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#ccc"} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`${v} records (${Math.round((v / total) * 100)}%)`, ""]} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ flex: 1, minWidth: "160px" }}>
        {pieData.map(({ name, value }) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: STATUS_COLORS[name] || "#ccc", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", color: "#2d363e", fontWeight: "500" }}>{name}</div>
              <div style={{ fontSize: "11px", color: "#6a747d" }}>{value} records · {Math.round((value / total) * 100)}%</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e3e8ec", fontSize: "11px", color: "#8f9aa4" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function AttendanceAnalytics({ analytics }) {
  const [view, setView] = useState("weekly");
  if (!analytics) return null;

  const weeklyPie = Object.entries(analytics.weekly || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const monthlyPie = aggregateToPie(analytics.monthly || []);
  const yearlyPie  = aggregateToPie(analytics.yearly  || []);

  const pieData = view === "weekly" ? weeklyPie : view === "monthly" ? monthlyPie : yearlyPie;
  const label =
    view === "weekly"  ? "This week's attendance breakdown" :
    view === "monthly" ? "This month's attendance breakdown" :
                         "This year's attendance breakdown";

  return (
    <section className="dashboard-panel" style={{ marginTop: "20px" }}>
      <div className="dashboard-panel-heading" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow">Attendance analytics</p>
          <h3>All employee attendance — {view} overview</h3>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["weekly", "monthly", "yearly"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: "4px 12px",
                borderRadius: "20px",
                border: "1px solid",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: view === v ? "500" : "400",
                background: view === v ? "#1c4162" : "transparent",
                borderColor: view === v ? "#1c4162" : "#c5d0d9",
                color: view === v ? "#fff" : "#1c4162",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <AttendancePieChart pieData={pieData} label={label} />
    </section>
  );
}

function PayrollAnalytics({ data }) {
  const [view, setView] = useState("department");
  const attendanceData = Object.entries(data.attendance || {}).map(([name, value]) => ({ name, value }));
  const chartData = view === "department"
    ? (data.departmentSalary || []).map((item) => ({ name: item.department, value: item.amount }))
    : view === "monthly"
      ? (data.monthlySalary || []).map((item) => ({ name: item.period, value: item.amount }))
      : attendanceData;
  const title = view === "department" ? "Salary cost by department" : view === "monthly" ? "Monthly net salary" : "Attendance overview";
  const isAttendance = view === "attendance";
  const isMonthly = view === "monthly";

  return (
    <section className="dashboard-panel payroll-analytics-panel">
      <div className="dashboard-panel-heading">
        <div><p className="eyebrow">Interactive analytics</p><h3>{title}</h3></div>
        <div className="insight-tabs">
          {[['department', 'Departments'], ['monthly', 'Monthly'], ['attendance', 'Attendance']].map(([key, label]) => <button key={key} type="button" className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>)}
        </div>
      </div>
      {chartData.length === 0 ? <div className="chart-empty">No data available yet.</div> : isAttendance ? (
        <div className="analytics-donut-wrap">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                {chartData.map((entry, index) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || colors[index % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} records`, 'Attendance']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="analytics-legend">{chartData.map((entry, index) => <span key={entry.name}><i style={{ background: STATUS_COLORS[entry.name] || colors[index % colors.length] }} />{entry.name}: {entry.value}</span>)}</div>
        </div>
      ) : isMonthly ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 8, right: 18, left: 8, bottom: 4 }}>
            <defs><linearGradient id="salaryTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b7cb5" stopOpacity={0.35} /><stop offset="95%" stopColor="#3b7cb5" stopOpacity={0.03} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#e3e8ec" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [money(value), 'Net salary']} />
            <Area type="monotone" dataKey="value" stroke="#175387" strokeWidth={3} fill="url(#salaryTrendFill)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="#e3e8ec" />
            <XAxis type="number" tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => [money(value), 'Salary cost']} />
            <Bar dataKey="value" fill="#175387" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

function PayrollRoleDashboard({ data, manager = false, admin = false }) {
  return (
    <div className="role-dashboard">
      <div className="role-welcome">
        <p className="eyebrow">
          {admin
            ? "System control center"
            : manager
              ? "Payroll management"
              : "Payroll operations"}
        </p>
        <h2>{admin ? "Full system overview" : "Payroll at a glance"}</h2>
        <p>
          {admin
            ? "Monitor users, workforce, payroll, attendance, and leave from one place."
            : "Track payrun readiness, payslips, validation, and payroll warnings."}
        </p>
      </div>
      <div className="dashboard-kpis role-kpis">
        <MetricCard label="Net salary" value={money(data.kpis.netSalary)} />
        <MetricCard
          label="Payslips generated"
          value={data.kpis.payslips}
          tone="blue"
        />
        <MetricCard
          label="Pending validation"
          value={data.pendingValidation}
          tone="gold"
        />
        <MetricCard
          label="Payroll warnings"
          value={data.payrollWarnings}
          tone="red"
        />
        {manager && (
          <MetricCard
            label="Salary structures"
            value={data.salaryStructures}
            tone="green"
          />
        )}
        {manager && (
          <MetricCard
            label="Salary rules"
            value={data.salaryRules}
            tone="blue"
          />
        )}
        {admin && <MetricCard label="Users" value={data.users} tone="gold" />}
        {admin && (
          <MetricCard label="Contracts" value={data.contracts} tone="red" />
        )}
      </div>
      <div className="role-grid">
        <section className="dashboard-panel">
          <p className="eyebrow">Current payrun</p>
          <h3>
            {data.currentPayrun
              ? `${data.currentPayrun.period} · ${data.currentPayrun.status}`
              : "No payrun yet"}
          </h3>
          <p className="module-note">
            {data.currentPayrun
              ? `${data.currentPayrun.payslips.length} payslips generated for this period.`
              : "Create a payrun to begin processing."}
          </p>
        </section>
        <section className="dashboard-panel">
          <p className="eyebrow">Salary summary</p>
          <h3>{money(data.kpis.netSalary)} net</h3>
          <p className="module-note">
            Average salary: {money(data.kpis.averageSalary)}
          </p>
        </section>
      </div>
      <PayrollAnalytics data={data} />
      {admin && <AttendanceAnalytics analytics={data.attendanceAnalytics} />}
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((error) =>
        toast.error(
          error.response?.data?.message || "Unable to load dashboard",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading)
    return <div className="dashboard-loading">Loading dashboard...</div>;
  if (!data)
    return (
      <div className="dashboard-loading">Dashboard data is unavailable.</div>
    );

  if (data.role === "Employee") return <EmployeeDashboard data={data} />;
  if (data.role === "HR Manager") return <OperationsDashboard data={data} />;
  if (["HR Payroll User", "HR Payroll Manager", "Admin"].includes(data.role))
    return (
      <PayrollRoleDashboard
        data={data}
        manager={data.role === "HR Payroll Manager"}
        admin={data.role === "Admin"}
      />
    );

  const kpiCards = [
    {
      label: "Net Salary",
      value: money(data.kpis.netSalary),
      icon: CircleDollarSign,
      tone: "green",
    },
    {
      label: "Payslips",
      value: data.kpis.payslips,
      icon: FileText,
      tone: "blue",
    },
    {
      label: "Avg Salary",
      value: money(data.kpis.averageSalary),
      icon: ArrowUpRight,
      tone: "gold",
    },
    {
      label: "Time Off",
      value: data.leave.pendingRequests,
      icon: CalendarDays,
      tone: "red",
    },
  ];
  const attendanceData = Object.entries(data.attendance).map(
    ([name, value]) => ({ name, value }),
  );

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-overview">
        <div>
          <p className="eyebrow">Payroll overview</p>
          <h2>Good morning, here is your workforce at a glance.</h2>
        </div>
        <div className="dashboard-date">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
      <div className="dashboard-kpis">
        {kpiCards.map(({ label, value, icon: Icon, tone }) => (
          <article className={`dashboard-kpi kpi-${tone}`} key={label}>
            <div className="kpi-icon">
              <Icon size={19} aria-hidden="true" />
            </div>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </div>
      {data.warnings.length > 0 && (
        <section className="dashboard-warnings">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Needs attention</strong>
            {data.warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        </section>
      )}
      <div className="dashboard-chart-grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Cost distribution</p>
              <h3>Salary Cost by Department</h3>
            </div>
            <UsersRound size={19} aria-hidden="true" />
          </div>
          {data.departmentSalary.length === 0 ? (
            <div className="chart-empty">No salary data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.departmentSalary}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid horizontal={false} stroke="#e3e8ec" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey="amount" fill="#1c4162" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Trend</p>
              <h3>Monthly Net Salary</h3>
            </div>
            <CircleDollarSign size={19} aria-hidden="true" />
          </div>
          {data.monthlySalary.length === 0 ? (
            <div className="chart-empty">No salary data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthlySalary}>
                <CartesianGrid vertical={false} stroke="#e3e8ec" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => money(value)} />
                <Bar dataKey="amount" fill="#6287a8" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
      <div className="dashboard-bottom-grid">
        <section className="dashboard-panel attendance-panel">
          <div className="dashboard-panel-heading">
            <div>
              <p className="eyebrow">Workforce pulse</p>
              <h3>Attendance Overview</h3>
            </div>
            <CalendarDays size={19} aria-hidden="true" />
          </div>
          <div className="attendance-summary">
            {attendanceData.map(({ name, value }, index) => (
              <div className="attendance-stat" key={name}>
                <span className={`attendance-dot dot-${index}`} />{" "}
                <strong>{value}</strong>
                <small>{name}</small>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie
                data={attendanceData}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={57}
                paddingAngle={3}
              >
                {attendanceData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>
        <section className="dashboard-panel dashboard-insight">
          <p className="eyebrow">Leave summary</p>
          <h3>{data.leave.pendingRequests} pending requests</h3>
          <p>
            {data.leave.pendingDays} days are waiting for HR approval. Approved
            requests automatically reduce employee balances.
          </p>
          <a href="/time-off">
            Review Time Off <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;