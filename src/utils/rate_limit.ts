import rateLimit from "express-rate-limit";

// Rate limiter middleware
const limiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 1, // Limit each IP to 1 request per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export {limiter};