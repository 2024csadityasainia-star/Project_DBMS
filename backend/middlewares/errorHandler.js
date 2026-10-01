function errorHandler(err, _req, res, _next) {
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "This record already exists." });
  }

  if (err.code === "ER_DATA_TOO_LONG") {
    return res.status(400).json({ message: "One of the entered values is too long for the database column." });
  }

  console.error(err);
  res.status(500).json({
    message: "Server error. Check MySQL connection, schema, and .env settings.",
    detail: err.message
  });
}

module.exports = errorHandler;
