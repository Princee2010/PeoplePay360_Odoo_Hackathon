import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
} from "../services/employeeService";
import { getContracts } from "../services/contractService";
import { getAttendanceList } from "../services/attendanceService";
import {
  getApplicableContract,
  previewPayroll,
} from "../services/payrollService";
import { getStoredUser } from "../services/authService";
import Pagination from "../components/Pagination";

const chartColors = ["#175387", "#3b7cb5", "#e0a458", "#d26464", "#7d8fc2"];
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;
const currentPayrollPeriod = () => new Date().toISOString().slice(0, 7);

const attendanceSummary = (records, hourLabel) => {
  const status = {};
  const hours = {};
  records.forEach((record) => {
    status[record.status] = (status[record.status] || 0) + 1;
    const workedHours = Number(record.workedHours || 0);
    if (workedHours > 0) {
      const label = hourLabel(new Date(record.date));
      hours[label] = Number(((hours[label] || 0) + workedHours).toFixed(2));
    }
  });
  return {
    status: Object.entries(status).map(([name, value]) => ({ name, value })),
    hours: Object.entries(hours).map(([name, value]) => ({ name, value })),
  };
};

const buildAttendanceInsights = (records) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const weekly = [];
  const monthly = [];
  const yearly = [];

  records.forEach((record) => {
    const date = new Date(record.date);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== now.getFullYear()
    )
      return;
    yearly.push(record);
    if (date.getMonth() === now.getMonth()) monthly.push(record);
    if (date >= startOfWeek && date <= now) weekly.push(record);
  });

  return {
    weekly: attendanceSummary(weekly, (date) =>
      date.toLocaleDateString("en-IN", { weekday: "short" }),
    ),
    monthly: attendanceSummary(
      monthly,
      (date) => `Week ${Math.ceil(date.getDate() / 7)}`,
    ),
    yearly: attendanceSummary(yearly, (date) =>
      date.toLocaleDateString("en-IN", { month: "short" }),
    ),
  };
};

const emptyEmployee = {
  employeeId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  jobPosition: "",
  manager: "",
  schedule: "",
  employeeType: "Full-time",
  joiningDate: "",
  status: "Active",
};

function EmployeeManagement({ mode = "list" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [employees, setEmployees] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [employeeContracts, setEmployeeContracts] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendancePeriod, setAttendancePeriod] = useState("weekly");
  const [payrollPeriod, setPayrollPeriod] = useState(currentPayrollPeriod);
  const [payrollPreview, setPayrollPreview] = useState(null);
  const [payrollError, setPayrollError] = useState("");
  const [relatedCounts, setRelatedCounts] = useState({
    contracts: 0,
    attendance: 0,
    timeOff: 0,
    allocations: 0,
  });
  const [form, setForm] = useState(emptyEmployee);
  const [profileForm, setProfileForm] = useState({
    phone: "",
    bankName: "",
    bankAccountNumber: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [employeePage, setEmployeePage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = getStoredUser();
  const isPersonalView = currentUser?.role === "Employee";
  const isHrPayrollUser = currentUser?.role === "HR Payroll User";
  const isPayrollRole =
    isHrPayrollUser || currentUser?.role === "HR Payroll Manager";

  const loadEmployees = async (query = search) => {
    try {
      setEmployees(await getEmployees(query));
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      if (mode === "list") {
        await loadEmployees("");
        return;
      }
      if (mode === "new") {
        setForm(emptyEmployee);
        setIsLoading(false);
        return;
      }
      const targetId = mode === "profile" ? currentUser?.employeeId : id;
      if (!targetId) {
        toast.error("No employee profile is linked to your account yet");
        setIsLoading(false);
        return;
      }
      try {
        const record = await getEmployee(targetId);
        setEmployee(record);
        setRelatedCounts(
          record.relatedCounts || {
            contracts: 0,
            attendance: 0,
            timeOff: 0,
            allocations: 0,
          },
        );
        setEmployeeContracts(await getContracts(record.employeeId));
        if (!isPersonalView) {
          const [attendance, contract] = await Promise.all([
            getAttendanceList({ employeeId: record.employeeId }),
            getApplicableContract(record.employeeId, currentPayrollPeriod()),
          ]);
          setAttendanceRecords(attendance);
          setPayrollPreview(contract ? { contract } : null);
        }
        setForm({
          ...record,
          joiningDate: record.joiningDate?.slice(0, 10) || "",
        });
        setProfileForm({
          phone: record.phone || "",
          bankName: record.bankName || "",
          bankAccountNumber: record.bankAccountNumber || "",
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to load employee");
      } finally {
        setIsLoading(false);
      }
    };
    loadPage();
  }, [mode, id]);

  const updateProfileField = (event) =>
    setProfileForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      const savedEmployee = await updateEmployee(employee._id, profileForm);
      setEmployee(savedEmployee);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    if (mode !== "detail" || !employee || isPersonalView) return;
    setPayrollError("");
    previewPayroll(employee.employeeId, payrollPeriod)
      .then(setPayrollPreview)
      .catch((error) => {
        setPayrollPreview(null);
        setPayrollError(
          error.response?.data?.message || "Payroll preview unavailable",
        );
      });
  }, [employee, isPersonalView, mode, payrollPeriod]);

  const attendanceInsights = useMemo(
    () => buildAttendanceInsights(attendanceRecords),
    [attendanceRecords],
  );
  const attendanceCharts = attendanceInsights[attendancePeriod];

  const updateField = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const openCreate = () => navigate("/employees/new");
  const openEdit = (record) => navigate(`/employees/${record._id}/edit`);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const savedEmployee =
        mode === "edit"
          ? await updateEmployee(id, form)
          : await createEmployee(form);
      toast.success(mode === "edit" ? "Employee updated" : "Employee added");
      navigate(`/employees/${savedEmployee._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save employee");
    }
  };

  const handleDelete = async (employee) => {
    if (!window.confirm(`Delete ${employee.firstName} ${employee.lastName}?`))
      return;
    try {
      await deleteEmployee(employee._id);
      toast.success("Employee deleted");
      navigate("/employees");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete employee");
    }
  };

  const departments = [
    ...new Set(employees.map((record) => record.department).filter(Boolean)),
  ].sort();
  const filteredEmployees = employees.filter(
    (record) =>
      (departmentFilter === "All departments" ||
        record.department === departmentFilter) &&
      (statusFilter === "All statuses" || record.status === statusFilter),
  );
  const employeePageSize = 10;
  const paginatedEmployees = filteredEmployees.slice(
    (employeePage - 1) * employeePageSize,
    employeePage * employeePageSize,
  );

  useEffect(() => {
    setEmployeePage(1);
  }, [search, departmentFilter, statusFilter]);

  if (mode === "detail" || mode === "profile") {
    if (isLoading)
      return <div className="employee-state">Loading employee...</div>;
    if (!employee)
      return <div className="employee-state">Employee not found.</div>;
    return (
      <div className="employee-detail">
        <div className="employee-detail-toolbar">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate(mode === "profile" ? "/" : "/employees")}
          >
            {mode === "profile" ? "← Back to dashboard" : "← Back to employees"}
          </button>
          {!isPersonalView && !isPayrollRole && (
            <button
              type="button"
              className="primary-action"
              onClick={() => openEdit(employee)}
            >
              <Pencil size={16} aria-hidden="true" /> Edit employee
            </button>
          )}
        </div>
        <div className="employee-detail-heading">
          <div className="employee-avatar">
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </div>
          <div>
            <p className="eyebrow">{employee.employeeId}</p>
            <h2>
              {employee.firstName} {employee.lastName}
            </h2>
            <p>
              {employee.jobPosition} · {employee.department}
            </p>
          </div>
        </div>
        <section
          className="employee-personal-section"
          aria-labelledby="personal-information-title"
        >
          <h3 id="personal-information-title">Personal Information</h3>
          <div className="employee-personal-grid">
            {[
              ["Email", employee.email],
              ["Phone", employee.phone || "—"],
              ["Joining Date", employee.joiningDate?.slice(0, 10) || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </div>
        </section>
        {isPersonalView && (
          <section
            className="employee-personal-section"
            aria-labelledby="update-details-title"
          >
            <h3 id="update-details-title">Update your details</h3>
            <form className="employee-form-grid" onSubmit={handleProfileSave}>
              {[
                ["phone", "Phone"],
                ["bankName", "Bank name"],
                ["bankAccountNumber", "Bank account number"],
              ].map(([name, label]) => (
                <label className="form-field" key={name}>
                  <span className="form-field-label">{label}</span>
                  <input
                    name={name}
                    value={profileForm[name]}
                    onChange={updateProfileField}
                    type="text"
                    className="form-field-input"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                </label>
              ))}
              <button
                type="submit"
                className="primary-action form-field-submit"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? "Saving..." : "Save changes"}
              </button>
            </form>
          </section>
        )}
        {!isPersonalView && (
          <>
            <section
              className="employee-inspection-section"
              aria-labelledby="employee-payroll-title"
            >
              <div className="section-heading-row">
                <div>
                  <p className="eyebrow">Admin view</p>
                  <h3 id="employee-payroll-title">Contract & payroll</h3>
                </div>
                <label className="period-picker">
                  Payroll period
                  <input
                    type="month"
                    value={payrollPeriod}
                    onChange={(event) => setPayrollPeriod(event.target.value)}
                  />
                </label>
              </div>
              <div className="employee-detail-grid">
                {[
                  [
                    "Contract wage",
                    payrollPreview?.contract
                      ? money(payrollPreview.contract.wage)
                      : "No active contract",
                  ],
                  [
                    "Gross salary",
                    payrollPreview?.grossSalary !== undefined
                      ? money(payrollPreview.grossSalary)
                      : "—",
                  ],
                  [
                    "Net salary",
                    payrollPreview?.netSalary !== undefined
                      ? money(payrollPreview.netSalary)
                      : "—",
                  ],
                  [
                    "Deductions",
                    payrollPreview?.totalDeductions !== undefined
                      ? money(payrollPreview.totalDeductions)
                      : "—",
                  ],
                  [
                    "Position",
                    payrollPreview?.contract?.position ||
                      employee.jobPosition ||
                      "—",
                  ],
                  ["Contract status", payrollPreview?.contract?.status || "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </div>
              {payrollError && <p className="module-note">{payrollError}</p>}
              {payrollPreview?.lines?.length > 0 && (
                <div className="salary-line-list">
                  {payrollPreview.lines.map((line) => (
                    <div className="role-list-row" key={line.code}>
                      <span>{line.name}</span>
                      <strong>{money(line.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section
              className="employee-inspection-section"
              aria-labelledby="employee-attendance-title"
            >
              <div className="section-heading-row">
                <div>
                  <p className="eyebrow">Admin view</p>
                  <h3 id="employee-attendance-title">Attendance charts</h3>
                </div>
                <span className="module-note">
                  {attendanceRecords.length} recorded day
                  {attendanceRecords.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="insight-tabs">
                {["weekly", "monthly", "yearly"].map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={attendancePeriod === period ? "active" : ""}
                    onClick={() => setAttendancePeriod(period)}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
              {attendanceRecords.length === 0 ? (
                <p className="module-note">
                  No attendance records for this employee.
                </p>
              ) : (
                <div className="insight-chart-grid employee-attendance-charts">
                  <div className="insight-chart">
                    <h4>Status breakdown</h4>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie
                          data={attendanceCharts.status}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={3}
                        >
                          {attendanceCharts.status.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={chartColors[index % chartColors.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="insight-legend">
                      {attendanceCharts.status.map((entry, index) => (
                        <span key={entry.name}>
                          <i
                            style={{
                              background:
                                chartColors[index % chartColors.length],
                            }}
                          />
                          {entry.name}: {entry.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="insight-chart">
                    <h4>Worked hours by month</h4>
                    {attendanceCharts.hours.length === 0 ? (
                      <div className="chart-empty" style={{ height: 190 }}>
                        No worked hours recorded.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie
                            data={attendanceCharts.hours}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={42}
                            outerRadius={68}
                            paddingAngle={3}
                          >
                            {attendanceCharts.hours.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={chartColors[index % chartColors.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value} hrs`} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div className="insight-legend">
                      {attendanceCharts.hours.map((entry, index) => (
                        <span key={entry.name}>
                          <i
                            style={{
                              background:
                                chartColors[index % chartColors.length],
                            }}
                          />
                          {entry.name}: {entry.value}h
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
        <section className="employee-hub" aria-labelledby="employee-hub-title">
          <h3 id="employee-hub-title">Employee workspace</h3>
          <div className="employee-summary-links">
            {[
              ["Contracts", relatedCounts.contracts, "/contracts"],
              ["Attendance", relatedCounts.attendance, "/attendance"],
              ["Time Off", relatedCounts.timeOff, "/time-off"],
              ["Allocations", relatedCounts.allocations, "/allocations"],
            ].map(([label, count, path]) => (
              <button
                type="button"
                className="employee-summary-link"
                key={label}
                onClick={() => navigate(path)}
              >
                <span>{label}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </section>
        <section
          className="employee-contract-history"
          aria-labelledby="contract-history-title"
        >
          <div className="section-heading-row">
            <h3 id="contract-history-title">Contract history</h3>
            <button
              type="button"
              className="back-link"
              onClick={() => navigate("/contracts")}
            >
              Manage contracts
            </button>
          </div>
          {employeeContracts.length === 0 ? (
            <p className="module-note">
              No contracts have been recorded for this employee.
            </p>
          ) : (
            <div className="contract-history-list">
              {employeeContracts.map((contract, index) => (
                <article className="contract-history-card" key={contract._id}>
                  <div>
                    <p className="contract-label">
                      Contract #{employeeContracts.length - index}
                    </p>
                    <strong>
                      {contract.startDate?.slice(0, 10)} →{" "}
                      {contract.endDate?.slice(0, 10) || "Present"}
                    </strong>
                    <p>
                      {contract.position} · {contract.department}
                    </p>
                  </div>
                  <div className="contract-wage">
                    ₹{Number(contract.wage).toLocaleString("en-IN")}
                    <span>{contract.status}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="employee-management">
      {mode === "list" && (
        <div className="employee-toolbar">
          <div className="employee-list-controls">
            <div className="employee-search">
              <Search size={17} aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && loadEmployees()}
                placeholder="Search employees..."
                aria-label="Search employees"
              />
              {search && (
                <button
                  type="button"
                  className="employee-search-clear"
                  aria-label="Clear search and show all employees"
                  onClick={() => {
                    setSearch("");
                    loadEmployees("");
                  }}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <select
              className="employee-filter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              aria-label="Filter by department"
            >
              <option>All departments</option>
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
            <select
              className="employee-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option>All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>
          </div>
          {!isPayrollRole && (
            <button
              type="button"
              className="primary-action"
              onClick={openCreate}
            >
              <Plus size={17} aria-hidden="true" /> Add employee
            </button>
          )}
        </div>
      )}
      {mode !== "list" && (
        <form className="employee-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <button
                type="button"
                className="back-link"
                onClick={() => navigate(id ? `/employees/${id}` : "/employees")}
              >
                ← Cancel
              </button>
              <h2>{mode === "edit" ? "Edit employee" : "Add employee"}</h2>
            </div>
            <X size={18} aria-hidden="true" />
          </div>
          <div className="employee-form-grid">
            {[
              ["employeeId", "Employee ID"],
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["bankName", "Bank name"],
              ["bankAccountNumber", "Bank account number"],
              ["department", "Department"],
              ["jobPosition", "Job position"],
              ["manager", "Manager"],
              ["schedule", "Schedule"],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  value={form[name]}
                  onChange={updateField}
                  type={name === "email" ? "email" : "text"}
                  required={[
                    "employeeId",
                    "firstName",
                    "lastName",
                    "email",
                    "department",
                    "jobPosition",
                  ].includes(name)}
                />
              </label>
            ))}
            <label>
              Employee type
              <select
                name="employeeType"
                value={form.employeeType}
                onChange={updateField}
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contractor</option>
                <option>Intern</option>
              </select>
            </label>
            <label>
              Joining date
              <input
                name="joiningDate"
                value={form.joiningDate}
                onChange={updateField}
                type="date"
                required
              />
            </label>
            <label>
              Status
              <select name="status" value={form.status} onChange={updateField}>
                <option>Active</option>
                <option>Inactive</option>
                <option>On Leave</option>
              </select>
            </label>
          </div>
          <button type="submit" className="primary-action">
            {mode === "edit" ? "Save changes" : "Create employee"}
          </button>
        </form>
      )}
      {mode === "list" && (
        <div className="employee-table-wrap">
          <table className="employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    Loading employees...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No employees found.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((record) => (
                  <tr key={record._id}>
                    <td className="employee-id">{record.employeeId}</td>
                    <td>
                      <button
                        type="button"
                        className="employee-name"
                        onClick={() => navigate(`/employees/${record._id}`)}
                      >
                        <strong>
                          {record.firstName} {record.lastName}
                        </strong>
                        <small>{record.email}</small>
                      </button>
                    </td>
                    <td>{record.department}</td>
                    <td>{record.jobPosition}</td>
                    <td>
                      <span
                        className={`status-badge status-${record.status.toLowerCase().replace(" ", "-")}`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {mode === "list" && (
        <Pagination
          page={employeePage}
          pageSize={employeePageSize}
          total={filteredEmployees.length}
          onPageChange={setEmployeePage}
        />
      )}
    </div>
  );
}

export default EmployeeManagement;