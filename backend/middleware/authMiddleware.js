const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
	const authorization = req.headers.authorization;
	const token = authorization && authorization.startsWith('Bearer ')
		? authorization.slice(7)
		: null;

	if (!token) {
		return res.status(401).json({ message: 'Authentication required' });
	}

	try {
		const claims = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(claims.id).select('name email role employeeId').populate('employeeId', 'employeeId');
		if (!user) return res.status(401).json({ message: 'User account not found' });
		req.user = { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId?._id, employeeCode: user.employeeId?.employeeId };
		return next();
	} catch (error) {
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
};

module.exports = authMiddleware;
