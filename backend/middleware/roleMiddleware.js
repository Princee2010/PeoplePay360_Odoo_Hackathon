const roleMiddleware = (...allowedRoles) => (req, res, next) => {
	if (!req.user || !allowedRoles.includes(req.user.role)) {
		console.log('[roleMiddleware] blocked', {
			path: req.originalUrl,
			method: req.method,
			userRole: req.user?.role,
			userId: req.user?.id,
			employeeId: req.user?.employeeId,
			allowedRoles,
		});
		return res.status(403).json({ message: 'Insufficient permissions' });
	}

	return next();
};

module.exports = roleMiddleware;