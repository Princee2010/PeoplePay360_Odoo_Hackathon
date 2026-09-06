const nodemailer = require('nodemailer');
const { createPayslipPdfBuffer } = require('./pdfService');

const getTransporter = () => {
	if (process.env.SMTP_URL) return nodemailer.createTransport(process.env.SMTP_URL);
	if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
		const error = new Error('Email delivery is not configured. Set SMTP_URL or SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.');
		error.statusCode = 503;
		throw error;
	}
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: process.env.SMTP_SECURE === 'true',
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
	});
};

const formatPeriod = (period) => new Date(`${period}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
const filenameFor = (employee, period) => `${employee.firstName}_${employee.lastName}_${formatPeriod(period).replace(' ', '_')}.pdf`;

const sendPayslips = async (payrun, payslips, employees) => {
	const transporter = getTransporter();
	const employeesById = new Map(employees.map((employee) => [employee.employeeId, employee]));
	const missingEmail = payslips.find((payslip) => !employeesById.get(payslip.employeeId)?.email);
	if (missingEmail) {
		const error = new Error(`Employee email is missing for ${missingEmail.employeeId}`);
		error.statusCode = 422;
		throw error;
	}

	const periodLabel = formatPeriod(payrun.period);
	const deliveries = await Promise.all(payslips.map(async (payslip) => {
		const employee = employeesById.get(payslip.employeeId);
		const attachment = await createPayslipPdfBuffer({ payslip, employee });
		const filename = filenameFor(employee, payrun.period);
		await transporter.sendMail({
			from: process.env.EMAIL_FROM || process.env.SMTP_USER,
			to: employee.email,
			subject: `${periodLabel} Payslip`,
			text: `Hello ${employee.firstName}, your ${periodLabel} payslip is attached.`,
			attachments: [{ filename, content: attachment, contentType: 'application/pdf' }],
		});
		return { employeeId: employee.employeeId, email: employee.email, filename };
	}));

	return { sent: deliveries.length, period: payrun.period, deliveries };
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
	const transporter = getTransporter();
	await transporter.sendMail({
		from: process.env.EMAIL_FROM || process.env.SMTP_USER,
		to,
		subject: 'Reset your PeoplePay360 password',
		text: `Hello ${name || 'there'},\n\nWe received a request to reset your PeoplePay360 password. Click the link below to choose a new one. This link expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
		html: `<p>Hello ${name || 'there'},</p><p>We received a request to reset your PeoplePay360 password. Click the button below to choose a new one. This link expires in 30 minutes.</p><p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#1c4162;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p><p>If the button doesn't work, copy and paste this link into your browser:<br />${resetUrl}</p><p>If you did not request this, you can safely ignore this email.</p>`,
	});
};

module.exports = { sendPayslips, sendPasswordResetEmail };