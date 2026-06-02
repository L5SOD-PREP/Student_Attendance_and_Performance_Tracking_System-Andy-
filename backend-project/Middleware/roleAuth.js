function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: 'Not authenticated.' });
        }
        if (!allowedRoles.includes(req.session.user.role)) {
            return res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
        }
        next();
    };
}

module.exports = authorize;
