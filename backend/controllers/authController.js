const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { sendPasswordResetEmail } = require('../services/emailService');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createToken = (user) => jwt.sign(
	{ id: user._id, role: user.role },
	process.env.JWT_SECRET,
	{ expiresIn: '1d' }
);

const serializeUser = (user, employee = null) => ({
	id: user._id,
	name: user.name,
	email: user.email,
	role: user.role,
	employeeId: user.employeeId || null,
	employee: employee ? {
		_id: employee._id,
		employeeId: employee.employeeId,
		firstName: employee.firstName,
		lastName: employee.lastName,
		department: employee.department,
	} : null,
});

const register = async (req, res) => {
	const name = req.body.name?.trim();
	const email = req.body.email?.trim().toLowerCase();
	const { password } = req.body;

	if (!name || !email || !password) {
		return res.status(400).json({ message: 'Name, email, and password are required' });
	}

	if (!/^\S+@\S+\.\S+$/.test(email)) {
		return res.status(400).json({ message: 'Enter a valid email address' });
	}

	if (password.length < 6) {
		return res.status(400).json({ message: 'Password must be at least 6 characters' });
	}

	const existingUser = await User.findOne({ email: email.toLowerCase() });
	if (existingUser) {
		return res.status(409).json({ message: 'Email is already registered' });
	}

	let user;
	try {
		user = await User.create({ name, email, password, role: 'Employee' });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ message: 'Email is already registered' });
		}
		throw error;
	}
	const token = createToken(user);
	let employee = await Employee.findOne({ email });
	if (!employee && user.role === 'Employee') {
		employee = await Employee.create({
			employeeId: `EMP-${String(user._id).slice(-6).toUpperCase()}`,
			firstName: name.split(' ')[0],
			lastName: name.split(' ').slice(1).join(' ') || 'Employee',
			email,
			department: 'General',
			jobPosition: 'Employee',
			joiningDate: new Date(),
			status: 'Active',
			userId: user._id,
		});
	}
	if (employee) {
		employee.userId = user._id;
		await employee.save();
		user.employeeId = employee._id;
		await user.save();
	}

	return res.status(201).json({ token, user: serializeUser(user, employee) });
};

const login = async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: 'Email and password are required' });
	}

	const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
	if (!user || !(await user.comparePassword(password))) {
		return res.status(401).json({ message: 'Invalid email or password' });
	}

	if (!user.employeeId) {
		const employee = await Employee.findOne({ email: user.email });
		if (employee) {
			employee.userId = user._id;
			user.employeeId = employee._id;
			await Promise.all([employee.save(), user.save()]);
		}
	}

	const employee = user.employeeId ? await Employee.findById(user.employeeId) : await Employee.findOne({ email: user.email });
	return res.json({ token: createToken(user), user: serializeUser(user, employee) });
};

const getCurrentUser = async (req, res) => {
	const user = await User.findById(req.user.id);
	const employee = user?.employeeId ? await Employee.findById(user.employeeId) : null;
	return res.json({ user: serializeUser(user, employee) });
};

const forgotPassword = async (req, res) => {
	const email = req.body.email?.trim().toLowerCase();
	const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

	if (!email) {
		return res.status(400).json({ message: 'Email is required' });
	}

	const user = await User.findOne({ email });
	// Always return the same response whether or not the account exists,
	// so the form can't be used to check which emails are registered.
	if (!user) {
		return res.json(genericResponse);
	}

	const rawToken = crypto.randomBytes(32).toString('hex');
	user.resetPasswordTokenHash = hashToken(rawToken);
	user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
	await user.save();

	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
	const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;

	try {
		await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
	} catch (error) {
		// Roll back the token so a failed email doesn't leave a dangling valid token.
		user.resetPasswordTokenHash = null;
		user.resetPasswordExpires = null;
		await user.save();
		return res.status(error.statusCode || 500).json({ message: error.message || 'Unable to send reset email' });
	}

	return res.json(genericResponse);
};

const resetPassword = async (req, res) => {
	const { token, password } = req.body;

	if (!token || !password) {
		return res.status(400).json({ message: 'Token and new password are required' });
	}
	if (password.length < 6) {
		return res.status(400).json({ message: 'Password must be at least 6 characters' });
	}

	const user = await User.findOne({
		resetPasswordTokenHash: hashToken(token),
		resetPasswordExpires: { $gt: new Date() },
	}).select('+resetPasswordTokenHash +resetPasswordExpires');

	if (!user) {
		return res.status(400).json({ message: 'This reset link is invalid or has expired' });
	}

	user.password = password;
	user.resetPasswordTokenHash = null;
	user.resetPasswordExpires = null;
	await user.save();

	return res.json({ message: 'Password updated. You can now sign in.' });
};

module.exports = { register, login, getCurrentUser, forgotPassword, resetPassword };