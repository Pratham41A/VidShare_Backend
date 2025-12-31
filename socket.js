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
        socket.disconnect();
        return;
      }

      const eventPath = path.join("event", eventId);
      fs.mkdirSync(eventPath, { recursive: true });
      const ffmpegProcess = createFFmpeg({
        eventId,
        inputFormat
      });  
      liveEvents.set(eventId,{ffmpegProcess,socketId:socket.id,status:'started'});
      startEvent(eventId);
      io.to(socket.id).emit("start", `Event Start : ${eventId}`);
    });
    socket.on("data", async ({ eventId, eventData }) => {
        const liveEvent = liveEvents.get(eventId);
        const buffer = Buffer.from(await eventData.arrayBuffer());
        if (liveEvent.ffmpegProcess.stdin.writable) {
          liveEvent.ffmpegProcess.stdin.write(buffer);
        }
    });
    socket.on("resume", ({ eventId,inputFormat }) => {
    const ffmpegProcess =  createFFmpeg({
        eventId,
        inputFormat,
        socket
      })
      liveEvents.set(eventId,{ffmpegProcess,socketId:socket.id,status:'started'});
      resumeEvent(eventId);
      io.to(socket.id).emit("start", `Event Start : ${eventId}`);
    });
    socket.on("pause", ({ eventId }) => {
      socket.disconnect();
      liveEvents.delete(eventId);
      io.to(socket.id).emit("pause", `Event Pause : ${eventId}`);
    })
    socket.on("stop", ({ eventId }) => {
      socket.disconnect();
      liveEvents.delete(eventId);
      endEvent(eventId);
      io.to(socket.id).emit("stop", `Event Stop : ${eventId}`);
    });
    socket.on("disconnect", () => {
      for (const [eventId,liveEvent] of liveEvents) {
        if (liveEvent.socketId===socket.id) {
          stopFFmpeg(liveEvent.ffmpegProcess);
          pauseEvent(eventId)
          io.to(socket.id).emit("pause", `Event Pause : ${eventId}`);
          return
        }
      }
    });
  });
}
