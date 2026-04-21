// structured request log line emitted after every response. one JSON object
// per request on stdout — Cloud Run forwards stdout to Cloud Logging, which
// auto-parses JSON and maps `severity` to log levels.
//
// mounted above /auth so unauthenticated hits are logged too. req.user is set
// by authMiddleware on protected routes; for /auth and /health it's undefined
// and we record "anonymous".
module.exports = function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const status = res.statusCode;
    const entry = {
      severity: status >= 500 ? "ERROR" : status >= 400 ? "WARNING" : "INFO",
      timestamp: new Date().toISOString(),
      userId: req.user?.uid ?? "anonymous",
      method: req.method,
      path: (req.originalUrl || req.url).split("?")[0],
      status,
      durationMs: Date.now() - start,
    };
    console.log(JSON.stringify(entry));
  });
  next();
};
