import express from 'express';
import cors from 'cors'
import dotenv from 'dotenv';
import routes from './routes/index.js';
import cookieParser from 'cookie-parser';
import cron from "node-cron"
import task from "./utils/queue_task.js"
import pendingCron from "./cron-jobs/pending.js"
dotenv.config();


const app = express();
const port = process.env.PORT || 3000;


// Middleware
app.use(express.json());
app.use(cookieParser());
cron.schedule("0 16 * * 1-5", task);
// cron.schedule("* * * * *", pendingCron);
app.post("/pending-cron", pendingCron)
 


app.use(cors({
  origin: [
    'https://api5.assanpay.com',
    'http://localhost:3005',
    'https://ban-merchant.assanpay.com',
    'https://ban-admin.assanpay.com',
    'https://bdplay.live/'
  ], 
  credentials: true,
}));

routes(app)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
