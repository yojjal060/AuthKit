const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res
      .status(403)
      .json({ message: "Forbidden: Insufficient role permissions" });
  }
  next();
};

export default requireRole;
