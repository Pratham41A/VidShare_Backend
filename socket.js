import fs from "fs";
import path from "path";
import {createFFmpeg, stopFFmpeg} from "./ffmpeg.js";
import {io} from './index.js'
import { startEvent,pauseEvent,resumeEvent,endEvent } from "./sqlite3.js";

export function initIO() {
  const liveEvents = new Map();
  io.on("connection", (socket) => {

    socket.on("start", ({ eventId, inputFormat }) => {

      if (!eventId || !["mp4", "webm"].includes(inputFormat)) {
        io.to(socket.id).emit("error", "Invalid Input Format");
        return;
      }

      const eventPath = path.join("event", eventId);
      fs.mkdirSync(eventPath, { recursive: true });
      const ffmpegProcess = createFFmpeg({
        eventId,
        inputFormat,
        socket
      });  
      liveEvents.set(eventId,{ffmpegProcess,socketId:socket.id,status:'started'});
      startEvent(eventId);
      io.to(socket.id).emit("start", `Event Start : ${eventId}`);
    });
    socket.on("data", async ({ eventId, eventBuffer }) => {
        const liveEvent = liveEvents.get(eventId);
        if (liveEvent.ffmpegProcess.stdin.writable) {
          liveEvent.ffmpegProcess.stdin.write(eventBuffer);
        }
    });
    socket.on("resume", ({ eventId,inputFormat }) => {
      //DB Update
      resumeEvent(eventId);
      //Process Start
      const ffmpegProcess =  createFFmpeg({
        eventId,
        inputFormat,
        socket
      })
      //Map Update
      liveEvents.set(eventId,{ffmpegProcess,socketId:socket.id,status:'started'});
      //Socket Notification
      io.to(socket.id).emit("start", `Event Start : ${eventId}`);
    });
    socket.on("pause", ({ eventId }) => {
      //DB Update
      pauseEvent(eventId);
      //Process End
      stopFFmpeg(liveEvents.get(eventId).ffmpegProcess);
      //Map Cleanup
      liveEvents.delete(eventId);
      //Socket Notification
      io.to(socket.id).emit("pause", `Event Pause : ${eventId}`);
    })
    socket.on("stop", ({ eventId }) => {
      //DB Update
      endEvent(eventId);
      //Process End
      stopFFmpeg(liveEvents.get(eventId).ffmpegProcess);
      //Map Cleanup
      liveEvents.delete(eventId);
      //Socket Notification
      io.to(socket.id).emit("stop", `Event Stop : ${eventId}`);
    });
    socket.on("disconnect", () => {
      for (const [eventId,liveEvent] of liveEvents) {
        if (liveEvent.socketId===socket.id) {
          //DB Update
          pauseEvent(eventId);
          //Process End
          stopFFmpeg(liveEvent.ffmpegProcess);
          //Map Cleanup
          liveEvents.delete(eventId);
          //Socket Notification
          io.to(socket.id).emit("pause", `Event Pause : ${eventId}`);
          return
        }
      }
    });
  });
}
