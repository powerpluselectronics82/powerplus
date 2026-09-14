const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/database");
const companyRouter = require("./router/company_router");
const branchRoutes = require("./router/branch_route");
const redis = require("./config/redis");
const userRouter = require("./router/user_router");
const productRouter = require("./router/product_route");
const saleRouter = require("./router/sale_route");
const supplierRouter = require("./router/supplier_route");
const categoryRouter = require("./router/category_route");
const brandRouter = require("./router/brand_route");
const systemRouter = require("./router/system_route");
const branchInventoryRouter = require("./router/branchInventry_route");
const purchasesRouter = require("./router/purchases_route");
const cookieParser = require("cookie-parser");
const cors = require("cors");

dotenv.config();
const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://powerplus-1k0d.onrender.com',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : []),
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.onrender\.com$/.test(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Base APIs
app.use("/api/company", companyRouter);
app.use("/api", branchRoutes);
app.use("/api", userRouter);
app.use("/api", productRouter);
app.use("/api", saleRouter);
app.use("/api", supplierRouter);
app.use("/api", categoryRouter);
app.use("/api", brandRouter);
app.use("/api", systemRouter);
app.use("/api", branchInventoryRouter);
app.use("/api", purchasesRouter);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${message}`);
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});
app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB();
redis.on("connect", () => {
  console.log("Redis connected");
});
