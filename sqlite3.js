import sqlite3 from 'sqlite3';
export var db
import {v7} from 'uuid'
import path from 'path'
import { uploadFile } from './backBlazeB2.js';
import { getDownloadAuthorization} from './backBlazeB2.js';

export function initializeDatabase() {
db = new sqlite3.Database('database.db');
//Synchronous Execution
db.serialize(() => {
db.run(`CREATE TABLE IF NOT EXISTS event (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  status TEXT NOT NULL  CHECK(status IN ('created','started', 'paused', 'ended')),
  FOREIGN KEY (ownerId) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
)`);
db.run(`CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  picture TEXT NOT NULL
)`);
});
}
export  function handleCreateUser(body) {
    const { name, email} = body;
    var picture=body.picture
    const id=v7()
     return new Promise((resolve, reject) => {

     const query = `SELECT * FROM user WHERE email = ?`;
    db.get(query, [email],async (err, row) => {
        if (err) {
            return reject(err);
        }
        if (row) {

            const downloadAuthorization=await getDownloadAuthorization(`user/picture/${email}`);
 picture = row.picture.includes('?Authorization=')
  ? row.picture.split('?Authorization=')[0]+'?Authorization='+downloadAuthorization
  : `${row.picture}?Authorization=${downloadAuthorization}`;
  
            const mutation = "UPDATE user SET  picture = ? WHERE id = ?"
            db.run(mutation, [picture,row.id],  (err) => {
                if (err) {return reject(err);}
                db.get(`SELECT * FROM user WHERE id = ?`, [row.id], (err, row) => {
                    if (err) return reject(err);
                    return resolve(row);
                });
            })
            resolve(row);
        } 

    const mutation = "INSERT INTO user (id, name, email, picture) VALUES (?, ?, ?, ?)"
db.run(mutation, [id, name, email, picture],  (err) => {
        if (err) {return reject(err);}
        
        db.get(`SELECT * FROM user WHERE id = ?`, [id], (err, row) => {
                    if (err) {return reject(err);}
                    return resolve(row);
                });
      });
    });
})
}
export function readUser(req,res){
    const {id}=req.user
    const query = `SELECT * FROM user WHERE id = ?`;
    db.get(query, [id], async (err, row) => {
        if (err) {
            return res.status(500).json({error:err.message});
        }
        if (row) {
       const downloadAuthorization= await getDownloadAuthorization(`user/picture/${row.email}`);
 const picture = row.picture.includes('?Authorization=')
  ? row.picture.split('?Authorization=')[0]+'?Authorization='+downloadAuthorization
  : `${row.picture}?Authorization=${downloadAuthorization}`;

        row.picture=picture
            return res.status(200).json({message:row});
        } else {
            return res.status(404).json({error:'No User'});
        }
    });
}
export function  checkAccess(req,res){
const {id:userId}=req.user
const {id:eventId}=req.params
     const query = `SELECT url,status,thumbnail,name FROM event WHERE id = ? AND ownerId = ?`;
    db.get(query, [eventId,userId], (err, row) => {
        if (err) {
            return res.status(500).json({error:err.message});
        }
        if (row) {
            row.type='owner'
            return res.status(200).json({message:row});
        } else {
            const queryPublic = `SELECT url,status,thumbnail,name FROM event WHERE id = ?`;
    db.get(queryPublic, [eventId], (err, rowPublic) => {
        if (err) {
            return res.status(500).json({error:err.message});
        }
        if (rowPublic) {
            rowPublic.type='public'
            return res.status(200).json({message:rowPublic});
        }
        else {
            return res.status(404).json({error:'No Event'});
        }
    });
        }
    });
}
export async  function handleCreateEvent(req,res) {
    //req.header('Content-Type');
    //req.get('Content-Type')
      const contentType = req.headers["content-type"]
      const eventId=v7()
      const {id:userId}=req.user
      const {name}=req.body
        var thumbnail

        if (req.file) {
      const fileName = `event/thumbnail/${eventId}${path.extname(req.file.originalname)}`;
            //Multer Memory Storage stores file data in buffer property/key
      const buffer = req.file.buffer;
            thumbnail = await uploadFile(fileName, buffer);
      }

const mutation =
  "INSERT INTO event (id, name, url, ownerId, status, thumbnail) VALUES (?, ?, ?, ?, ?, ?)";
    db.run(mutation, [eventId, name,`${process.env.BACKEND_SERVER_URL}/event/${eventId}/index.m3u8`, userId, 'created',thumbnail], function (err) {
    if (err) {
        return res.status(500).json({error:err.message});
    }
    else{
         db.get(`SELECT * FROM event WHERE id = ?`, [eventId], (err, row) => {
                    if (err) return res.status(500).json({error:err.message});
                    if (row) return res.status(201).json({message:row});
                });
    }
})}
export function fetchEvents(req,res){

    const query = `SELECT status,thumbnail,name,id FROM event`;
    db.all(query,async (err, rows) => {
        if (err) {
            return res.status(500).json({error:err.message});
        }
        if (rows){
           await Promise.all( rows.map(async(row) => {
                 const downloadAuthorization=await getDownloadAuthorization(`event/thumbnail/${row.id}`);
                const thumbnail = row.thumbnail.includes('?Authorization=')
                ? row.thumbnail.split('?Authorization=')[0]+'?Authorization='+downloadAuthorization
                : `${row.thumbnail}?Authorization=${downloadAuthorization}`;
                row.thumbnail=thumbnail
            }))
        return res.status(200).json({message:rows});
        }
    });
}
export function pauseEvent(eventId) {
    return new Promise((resolve, reject) => {
        const mutation =
          "UPDATE event SET status = 'paused' WHERE id = ? AND status = 'started'";
        db.run(mutation, [eventId], function (err) {
            if (err) return reject(err);
            resolve();
        });
    });
}
export function startEvent(eventId){
    return new Promise((resolve, reject) => {
        const mutation =
          "UPDATE event SET status = 'started' WHERE id = ? AND status = 'created'";
        db.run(mutation, [eventId], function (err) {
            if (err) return reject(err);
            resolve();
        });
    })
}
export function resumeEvent(eventId){
    return new Promise((resolve, reject) => {
        const mutation =
          "UPDATE event SET status = 'started' WHERE id = ? AND status = 'paused'";
        db.run(mutation, [eventId], function (err) {
            if (err) return reject(err);
            resolve();
        });
    })
}
export function endEvent(eventId){
    return new Promise((resolve, reject) => {
        const mutation = `
  UPDATE event
  SET status = 'ended'
  WHERE id = ?
    AND (status = 'started' OR status = 'paused')
`;

        db.run(mutation, [eventId], function (err) {
            if (err) return reject(err);
            resolve();
        });
    })
}