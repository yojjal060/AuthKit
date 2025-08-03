const tenantMiddleware = (req, res, next) => {
  try {
    // Get tenant ID from various sources
    const tenantId = req.headers["x-tenant-id"] ||
                    req.headers["x-app-name"] ||
                    req.query.tenantId ||
                    "default"; // Default tenant for backward compatibility

    // Clean and attach tenant info to request
    req.tenantId = tenantId.toString().toLowerCase().trim();

    next();
  } catch (error) {
    res.status(500).json({ message: "Tenant processing error" });
  }
};

export default tenantMiddleware;