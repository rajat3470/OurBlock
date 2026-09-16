// MongoDB initialization script.
// Creates the application database user used by the backend.
// Runs automatically when the mongo container starts for the first time.

db = db.getSiblingDB("mohallamitr");

db.createUser({
  user: "mohallamitr_app",
  pwd: "CHANGE_ME_MONGO_APP_PASSWORD",
  roles: [
    { role: "readWrite", db: "mohallamitr" }
  ]
});

// Optional: create a capped collection for application logs/audit trail.
// db.createCollection("app_logs", { capped: true, size: 10485760, max: 5000 });
