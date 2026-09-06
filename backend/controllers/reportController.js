const Attendance = require('../models/Attendance');
const Contract = require('../models/Contract');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const Payslip = require('../models/Payslip');
const SalaryRule = require('../models/SalaryRule');
const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');
const { createPersonalReportPdfBuffer, createReportPdfBuffer } = require('../services/pdfService');

const reportController = async (req, res) => {
  const role = req.user.role;
  const isEmployee = role === 'Employee';
  const canPayroll = ['HR Payroll User', 'HR Payroll Manager', 'Admin'].includes(role);
  const canSalaryView = ['HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'].includes(role);
  const canSystem = role === 'Admin';
  const canWarnings = canPayroll;

  const employeeFilter = isEmployee ? { _id: req.user.employeeId } : {};
  const employee = isEmployee ? await Employee.findById(req.user.employeeId).lean() : null;
  const employeeId = employee?.employeeId;
  const [employees, attendance, leaveRequests, leaveTypes, contracts] = await Promise.all([
    Employee.find(employeeFilter).sort({ firstName: 1, lastName: 1 }).lean(),
    Attendance.find(isEmployee ? { employeeId } : {}).sort({ date: -1 }).limit(100).lean(),
    LeaveRequest.find(isEmployee ? { employeeId: req.user.employeeId } : {}).populate('employeeId', 'employeeId firstName lastName').populate('leaveTypeId', 'name').sort({ fromDate: -1 }).limit(100).lean(),
    LeaveType.find({ isActive: true }).sort({ name: 1 }).lean(),
    Contract.find(isEmployee ? { employeeId } : {}).sort({ startDate: -1 }).limit(100).lean(),
  ]);

  const response = {
    role,
    permissions: { canPayroll, canSalaryView, canSystem, canWarnings, isEmployee },
    overview: {
      employees: employees.filter((employee) => employee.status !== 'Inactive').length,
      attendanceRecords: attendance.length,
      leaveRequests: leaveRequests.length,
      contracts: contracts.length,
      pendingLeave: leaveRequests.filter((request) => request.status === 'Pending').length,
      departments: [...new Set(employees.map((employee) => employee.department).filter(Boolean))].map((department) => ({
        department,
        employees: employees.filter((employee) => employee.department === department).length,
        active: employees.filter((employee) => employee.department === department && employee.status === 'Active').length,
      })),
    },
    employees,
    attendance,
    leave: { requests: leaveRequests, types: leaveTypes },
    contracts,
  };

  if (canPayroll) {
    const payslips = await Payslip.find().sort({ period: -1, employeeId: 1 }).limit(200).lean();
    response.payroll = {
      payslips,
      totalNetSalary: payslips.reduce((total, payslip) => total + (payslip.netSalary || 0), 0),
      totalGrossSalary: payslips.reduce((total, payslip) => total + (payslip.grossSalary || 0), 0),
    };
    response.warnings = [
      ...employees.filter((employee) => employee.status === 'Active' && !contracts.some((contract) => contract.employeeId === employee.employeeId && contract.status !== 'Cancelled')).map((employee) => `No active contract for ${employee.employeeId}`),
      ...leaveRequests.filter((request) => request.status === 'Pending').map((request) => `Leave request awaiting approval for ${request.employeeId}`),
    ];
  }

  if (canSalaryView) {
    response.salary = {
      structures: await SalaryStructure.find().populate('ruleIds').sort({ name: 1 }).lean(),
      rules: await SalaryRule.find().sort({ sequence: 1, name: 1 }).lean(),
    };
  }

  if (canSystem) {
    response.users = await User.find().select('name email role employeeId createdAt').sort({ role: 1, name: 1 }).lean();
  }

  return res.json(response);
};

const personalReportPdf = async (req, res) => {
  const reportType = req.params.type;
  if (!['attendance', 'leave'].includes(reportType)) return res.status(400).json({ message: 'Report type must be attendance or leave' });

  const employee = await Employee.findById(req.user.employeeId).lean();
  if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

  const [attendance, leaveRequests] = await Promise.all([
    reportType === 'attendance' ? Attendance.find({ employeeId: employee.employeeId }).sort({ date: -1 }).limit(100).lean() : [],
    reportType === 'leave' ? LeaveRequest.find({ employeeId: employee._id }).populate('leaveTypeId', 'name').sort({ fromDate: -1 }).limit(100).lean() : [],
  ]);
  const buffer = await createPersonalReportPdfBuffer({ employee, reportType, attendance, leaveRequests });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${employee.employeeId}.pdf"`);
  return res.send(buffer);
};

const managementReportPdf = async (req, res) => {
  const reportType = req.params.type;
  if (['HR Payroll User'].includes(req.user.role)) return res.status(403).json({ message: 'Report export is available to payroll managers only' });
  const canPayroll = ['HR Payroll User', 'HR Payroll Manager', 'Admin'].includes(req.user.role);
  const canSalaryView = ['HR Manager', 'HR Payroll User', 'HR Payroll Manager', 'Admin'].includes(req.user.role);
  const canSystem = req.user.role === 'Admin';
  if (reportType === 'payroll' || reportType === 'payslip' || reportType === 'payroll-warnings') if (!canPayroll) return res.status(403).json({ message: 'Payroll report access denied' });
  if (reportType === 'salary-rule' || reportType === 'salary-structure') if (!canSalaryView) return res.status(403).json({ message: 'Salary report access denied' });
  if (reportType === 'system-user') if (!canSystem) return res.status(403).json({ message: 'System report access denied' });

  const [employees, attendance, leaveRequests, contracts, payslips, rules, structures, users] = await Promise.all([
    Employee.find().sort({ firstName: 1 }).lean(), Attendance.find().sort({ date: -1 }).limit(200).lean(), LeaveRequest.find().populate('employeeId', 'employeeId firstName lastName').populate('leaveTypeId', 'name').sort({ fromDate: -1 }).limit(200).lean(), Contract.find().sort({ startDate: -1 }).limit(200).lean(), Payslip.find().sort({ period: -1 }).limit(200).lean(), SalaryRule.find().sort({ sequence: 1 }).lean(), SalaryStructure.find().populate('ruleIds').sort({ name: 1 }).lean(), User.find().select('name email role createdAt').sort({ role: 1 }).lean(),
  ]);
  const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
  const rows = {
    overview: [`Employees: ${employees.length}`, `Attendance records: ${attendance.length}`, `Leave requests: ${leaveRequests.length}`, `Contracts: ${contracts.length}`],
    employees: employees.map((e) => `${e.employeeId} | ${e.firstName} ${e.lastName} | ${e.department} | ${e.status}`),
    attendance: attendance.map((a) => `${a.employeeId} | ${new Date(a.date).toLocaleDateString('en-IN')} | ${a.status} | ${a.workedHours || 0} hours`),
    leave: leaveRequests.map((l) => `${l.employeeId?.employeeId || '—'} | ${l.leaveTypeId?.name || '—'} | ${l.days} days | ${l.status}`),
    contracts: contracts.map((c) => `${c.employeeId} | ${new Date(c.startDate).toLocaleDateString('en-IN')} - ${c.endDate ? new Date(c.endDate).toLocaleDateString('en-IN') : 'Present'} | ${money(c.wage)}`),
    payroll: payslips.map((p) => `${p.employeeId} | ${p.period} | Gross ${money(p.grossSalary)} | Net ${money(p.netSalary)}`),
    payslip: payslips.map((p) => `${p.employeeId} | ${p.period} | Net ${money(p.netSalary)}`),
    'salary-rule': rules.map((r) => `${r.code} | ${r.name} | ${r.category} | ${r.calculationType}`),
    'salary-structure': structures.map((s) => `${s.name} | ${s.ruleIds.length} rules | ${s.isActive ? 'Active' : 'Inactive'}`),
    'system-user': users.map((u) => `${u.name} | ${u.email} | ${u.role}`),
    'payroll-warnings': employees.filter((e) => e.status === 'Active' && !contracts.some((c) => c.employeeId === e.employeeId && c.status !== 'Cancelled')).map((e) => `No active contract for ${e.employeeId}`),
    'department-analytics': [...new Set(employees.map((e) => e.department))].map((department) => `${department} | ${employees.filter((e) => e.department === department).length} employees`),
  };
  const title = reportType.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const buffer = await createReportPdfBuffer({ title, subtitle: `Downloaded by ${req.user.role}`, sections: [{ heading: title, rows: rows[reportType] || rows.overview }] });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.pdf"`);
  return res.send(buffer);
};

module.exports = { reportController, personalReportPdf, managementReportPdf };
