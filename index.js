import "dotenv/config";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { initializeGoogleLogin } from "./googleStrategy.js";
import { initializeDatabase } from "./sqlite3.js";
import router from './routes.js'
import http from 'http';
import {initIO} from './socket.js' 
import passport from "passport";  

const origins = process.env.ORIGINS.split(",");
const app = express();
app.use(cors({origin: 
  function(origin,cb){
 if (!origin||origins.includes(origin)) return cb(null, true);
  else {
    return  cb(new Error("Invalid Origin"));
    }
  },credentials: true}));

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/',router)
//Add Authentication Middleware
app.use("/event",express.static('event')); 

const server = http.createServer(app);
 export const io = new Server(server, { cors: { origin: process.env.FRONTEND_SERVER_URL,credentials: true},transports: ['websocket'] });

server.listen(process.env.PORT,async () => {console.log(`Running`)
  initializeDatabase();
  initializeGoogleLogin();
  initIO();
});