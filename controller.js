import { handleCreateUser } from './sqlite3.js';
import jwt from 'jsonwebtoken'
import { uploadFile } from "./backBlazeB2.js";

export async function googleCallback(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(process.env.FRONTEND_SERVER_URL);
    }

    const { displayName, emails, photos } = user;

    //=s[Any Count of Digits]-c
    const photo=photos[0].value.replace(/=s\d+-c/, "=s1024-c")

    const photoResponse = await fetch(photo);
    //Cloud doesn't support arrayBuffer, they support Buffer.
    const buffer = Buffer.from(await photoResponse.arrayBuffer());

    const fileName = `user/picture/${emails[0].value}.png`;
    const picture = await uploadFile(fileName, buffer);

   const dbUser = await handleCreateUser({
      name: displayName,
      email: emails[0].value,
      picture
    });

    const token = jwt.sign(
      { id: dbUser.id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

   return res.redirect(`${process.env.FRONTEND_SERVER_URL}?token=${token}`);
  } catch (error) {
    console.error("googleCallback : ", error.message);
   return  res.redirect(process.env.FRONTEND_SERVER_URL);
  }
}

export async function generateToken(req, res) {
  try {
    const {token}=req.body
    jwt.verify(token, process.env.JWT_SECRET);
 
      res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: process.env.COOKIE_SAME_SITE,
      maxAge: 24 * 60 * 60 * 1000,
    });
   return res.sendStatus(200);
  } catch (error) {
    console.error("generateToken : ", error.message);
   return res.status(401).json({ error: 'Invalid Token' }); 
  }
}