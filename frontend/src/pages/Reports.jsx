import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  UsersRound,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  downloadManagementReport,
  downloadPersonalReport,
  getReports,
} from "../services/reportService";
import Pagination from "../components/Pagination";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

function Reports() {
  const [data, setData] = useState(null);
  const [activeReport, setActiveReport] = useState("Overview");
  const [search, setSearch] = useState("");
  const canExportReports = !data?.permissions?.isEmployee && data?.role !== "HR Payroll User";
  const [reportPage, setReportPage] = useState(1);

  useEffect(() => {
    getReports()
      .then(setData)
      .catch((error) =>
        toast.error(error.response?.data?.message || "Unable to load reports"),
      );
  }, []);

  const reports = useMemo(() => {
    if (!data) return [];
    if (data.permissions.isEmployee)
      return ["Attendance Report", "Leave Report"];
    const items = [
      ["Overview", true],
      ["Employee Report", true],
      ["Attendance Report", true],
      ["Leave Report", true],
      ["Contract Report", true],
      ["Payroll Report", data.permissions.canPayroll],
      ["Payslip Report", data.permissions.canPayroll],
      ["Salary Rule Report", data.permissions.canSalaryView],
      ["Payroll Warnings", data.permissions.canWarnings],
      ["Department Analytics", true],
    ];
    if (data.permissions.canSalaryView)
      items.push(["Salary Structure Report", true]);
    if (data.permissions.canSystem) items.push(["System/User Report", true]);
    return items.filter(([, allowed]) => allowed).map(([label]) => label);
  }, [data]);

  useEffect(() => {
    if (reports.length && !reports.includes(activeReport))
      setActiveReport(reports[0]);
  }, [reports, activeReport]);

  useEffect(() => {
    setReportPage(1);
  }, [activeReport, search]);

  if (!data) return <div className="dashboard-loading">Loading reports...</div>;

  const selectedReport = reports.includes(activeReport)
    ? activeReport
    : reports[0];
  const reportType = {
    Overview: "overview",
    "Employee Report": "employees",
    "Attendance Report": "attendance",
    "Leave Report": "leave",
    "Contract Report": "contracts",
    "Payroll Report": "payroll",
    "Payslip Report": "payslip",
    "Salary Rule Report": "salary-rule",
    "Salary Structure Report": "salary-structure",
    "Department Analytics": "department-analytics",
    "System/User Report": "system-user",
    "Payroll Warnings": "payroll-warnings",
  }[selectedReport];

  const query = search.toLowerCase().trim();
  const employeeRows = data.employees.filter((employee) =>
    `${employee.employeeId} ${employee.firstName} ${employee.lastName} ${employee.department}`
      .toLowerCase()
      .includes(query),
  );
  const attendanceRows = data.attendance.filter((record) =>
    `${record.employeeId} ${record.status} ${record.remarks}`
      .toLowerCase()
      .includes(query),
  );
  const contractRows = data.contracts.filter((contract) =>
    `${contract.employeeId} ${contract.department} ${contract.position}`
      .toLowerCase()
      .includes(query),
  );

  const renderTable = (headers, rows, empty = "No records found.") => {
    const pageSize = 10;
    const paginatedRows = rows.slice((reportPage - 1) * pageSize, reportPage * pageSize);
    return <>
      <div className="report-table-wrap">
        <table className="report-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            paginatedRows
          ) : (
            <tr>
              <td colSpan={headers.length} className="empty-state">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
      <Pagination page={reportPage} pageSize={pageSize} total={rows.length} onPageChange={setReportPage} />
    </>;
  };

  const content = {
    "Employee Report": renderTable(
      ["ID", "Name", "Department", "Position", "Status"],
      employeeRows.map((employee) => (
        <tr key={employee._id}>
          <td>{employee.employeeId}</td>
          <td>
            <strong>
              {employee.firstName} {employee.lastName}
            </strong>
            <small>{employee.email}</small>
          </td>
          <td>{employee.department}</td>
          <td>{employee.jobPosition}</td>
          <td>{employee.status}</td>
        </tr>
      )),
    ),
    "Attendance Report": renderTable(
      ["Employee", "Date", "Check in", "Check out", "Hours", "Status"],
      attendanceRows.map((record) => (
        <tr key={record._id}>
          <td>{record.employeeId}</td>
          <td>{date(record.date)}</td>
          <td>{record.checkIn || "—"}</td>
          <td>{record.checkOut || "—"}</td>
          <td>{record.workedHours}</td>
          <td>{record.status}</td>
        </tr>
      )),
    ),
    "Leave Report": renderTable(
      ["Employee", "Type", "From", "To", "Days", "Status"],
      data.leave.requests.map((request) => (
        <tr key={request._id}>
          <td>{request.employeeId?.employeeId || request.employeeId || "—"}</td>
          <td>{request.leaveTypeId?.name || "—"}</td>
          <td>{date(request.fromDate)}</td>
          <td>{date(request.toDate)}</td>
          <td>{request.days}</td>
          <td>{request.status}</td>
        </tr>
      )),
    ),
    "Contract Report": renderTable(
      ["Employee", "Period", "Department", "Position", "Wage", "Status"],
      contractRows.map((contract) => (
        <tr key={contract._id}>
          <td>{contract.employeeId}</td>
          <td>
            {date(contract.startDate)} →{" "}
            {contract.endDate ? date(contract.endDate) : "Present"}
          </td>
          <td>{contract.department}</td>
          <td>{contract.position}</td>
          <td>{money(contract.wage)}</td>
          <td>{contract.status}</td>
        </tr>
      )),
    ),
    "Payroll Report": renderTable(
      ["Employee", "Period", "Gross", "Deductions", "Net"],
      (data.payroll?.payslips || []).map((payslip) => (
        <tr key={payslip._id}>
          <td>{payslip.employeeId}</td>
          <td>{payslip.period}</td>
          <td>{money(payslip.grossSalary)}</td>
          <td>{money(payslip.totalDeductions)}</td>
          <td>
            <strong>{money(payslip.netSalary)}</strong>
          </td>
        </tr>
      )),
      "No payroll has been processed yet.",
    ),
    "Payslip Report": renderTable(
      ["Employee", "Period", "Structure", "Net salary"],
      (data.payroll?.payslips || []).map((payslip) => (
        <tr key={payslip._id}>
          <td>{payslip.employeeId}</td>
          <td>{payslip.period}</td>
          <td>{payslip.salaryStructureId || "—"}</td>
          <td>{money(payslip.netSalary)}</td>
        </tr>
      )),
      "No payslips found.",
    ),
    "Salary Rule Report": renderTable(
      ["Code", "Name", "Category", "Sequence", "Calculation"],
      (data.salary?.rules || []).map((rule) => (
        <tr key={rule._id}>
          <td>{rule.code}</td>
          <td>{rule.name}</td>
          <td>{rule.category}</td>
          <td>{rule.sequence}</td>
          <td>
            {rule.calculationType === "Formula"
              ? rule.formula
              : rule.calculationType === "Percentage"
                ? `${rule.value}%`
                : money(rule.value)}
          </td>
        </tr>
      )),
    ),
    "Salary Structure Report": renderTable(
      ["Name", "Description", "Rules", "Status"],
      (data.salary?.structures || []).map((structure) => (
        <tr key={structure._id}>
          <td>{structure.name}</td>
          <td>{structure.description || "—"}</td>
          <td>{structure.ruleIds.length}</td>
          <td>{structure.isActive ? "Active" : "Inactive"}</td>
        </tr>
      )),
    ),
    "Department Analytics": renderTable(
      ["Department", "Employees", "Active employees"],
      data.overview.departments.map((department) => (
        <tr key={department.department}>
          <td>
            <strong>{department.department}</strong>
          </td>
          <td>{department.employees}</td>
          <td>{department.active}</td>
        </tr>
      )),
    ),
    "System/User Report": renderTable(
      ["Name", "Email", "Role", "Created"],
      (data.users || []).map((user) => (
        <tr key={user._id}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>{user.role}</td>
          <td>{date(user.createdAt)}</td>
        </tr>
      )),
    ),
    "Payroll Warnings": (
      <div className="report-warning-list">
        {data.warnings?.length ? (
          data.warnings.map((warning) => (
            <div key={warning}>
              <AlertTriangle size={17} />
              {warning}
            </div>
          ))
        ) : (
          <div className="report-success">
            <CheckCircle2 size={17} />
            No payroll warnings.
          </div>
        )}
      </div>
    ),
  }[selectedReport];

  return (
    <div className="reports-page">
      <div className="reports-intro">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Workforce intelligence</h2>
          <p>
            Review operational, payroll, and compliance information based on
            your role.
          </p>
        </div>
        <BarChart3 size={27} aria-hidden="true" />
      </div>
      <div className="report-tabs">
        {reports.map((report) => (
          <button
            key={report}
            type="button"
            className={selectedReport === report ? "active" : ""}
            onClick={() => {
              setActiveReport(report);
              setSearch("");
            }}
          >
            {report}
          </button>
        ))}
      </div>
      <div className="report-toolbar">
        {selectedReport !== "Overview" &&
          selectedReport !== "Payroll Warnings" && (
            <label>
              Search report
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records..."
              />
            </label>
          )}
        {canExportReports && <button
          type="button"
          className="primary-action report-download"
          onClick={() =>
            (data.permissions.isEmployee
              ? downloadPersonalReport(
                  selectedReport === "Leave Report" ? "leave" : "attendance",
                )
              : downloadManagementReport(reportType)
            ).catch(() => toast.error("Unable to download report"))
          }
        >
          <Download size={16} aria-hidden="true" /> Download PDF
        </button>}
      </div>
      {selectedReport === "Overview" ? (
        <div className="report-overview-grid">
          {[
            ["Employees", data.overview.employees, UsersRound],
            [
              "Attendance records",
              data.overview.attendanceRecords,
              CheckCircle2,
            ],
            ["Leave requests", data.overview.leaveRequests, FileText],
            ["Contracts", data.overview.contracts, FileText],
            ...(data.permissions.canPayroll
              ? [["Net payroll", money(data.payroll.totalNetSalary), BarChart3]]
              : []),
          ].map(([label, value, Icon]) => (
            <article key={label}>
              <Icon size={19} />
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      ) : (
        content
      )}
    </div>
  );
}

export default Reports;
