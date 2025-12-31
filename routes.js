import {   readUser, fetchEvents, checkAccess, handleCreateEvent } from "./sqlite3.js";
import { Router } from "express";
import { auth } from "./middleware.js";
import {generateToken, googleCallback} from "./controller.js";
import passport from "passport";
import { upload } from "./multer.js";

 const router = Router();

router.get('/fetchEvents',auth,fetchEvents)
router.post("/createEvent",auth,upload.single('thumbnail'),handleCreateEvent)    
router.post('/checkAccess/:id',auth,checkAccess)
router.get('/google/login',passport.authenticate("google", { scope: ["email", "profile"],prompt:"select_account" }));
router.get("/google/callback",passport.authenticate("google", {failureRedirect:process.env.FRONTEND_SERVER_URL, session: false }),googleCallback);
router.post('/google/generateToken',generateToken)
router.get('/readUser',auth,readUser)
router.get("/", (req, res) => {
    res.send("Om Ganeshaay Namah");
});
    
export default router;