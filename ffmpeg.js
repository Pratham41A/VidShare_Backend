import { spawn } from "child_process";
import { pauseEvent } from "./sqlite3.js";
import { io } from "./index.js";

export function createFFmpeg({ eventId,inputFormat,socket }) {

const ffmpegArgs = [
  "-f", inputFormat,        
  "-i", "pipe:0",

  "-c:v", "libx264",//Video Encoding
  "-crf", "16",      //Video Quality       
  "-preset", "slow", //Encoding Speed 
  //Decoding done by Player 
  "-profile:v", "baseline",//Video Compatibility for Devices
  "-pix_fmt", "yuv420p",//Universally Accepted Color Format
  /*
  Key-Frame is Full/Base Image,
  Predicted Frames are Instructions,
  No Storing of All Full Image/Frame,
  Storing of Predicted Frames and Generating Full Image/Frame by executing Predicted Frame's Instructions.
  Key-Frame Generation for each 60 Frame/Predicted Frame
  */
  "-g", "60",           
  "-sc_threshold", "0",//Disable Automation Key-Frames

  "-c:a", "aac",//Audio Encoding
  "-b:a", "192k",//Audio Quality

  "-fflags", "nobuffer",
  "-flags", "low_delay",
  "-reset_timestamps", "1",//Won't Show Blank Screen for Previous Segments

  "-f", "hls",
  "-hls_time", "5",
  "-hls_list_size", "5",
  "-hls_flags", "delete_segments+independent_segments",
  "-hls_segment_type", "mpegts",
  "-hls_segment_filename",
  path.join("event", eventId, "%d.ts"),
  path.join("event", eventId, "index.m3u8"),
];

  const ffmpeg = spawn("ffmpeg", ffmpegArgs);
 
  ffmpeg.on("error", () =>
  {
    stopFFmpeg(ffmpeg);
    pauseEvent(eventId);
    io.to(socket.id).emit("pause", "FFMPEG ERROR");
  });

  return ffmpeg;
}


export function stopFFmpeg(ffmpegProcess) {
  if (!ffmpegProcess) return;
  ffmpegProcess.stdin?.write('q');
setTimeout(() => {
    if (!ffmpegProcess.exitCode) {
      ffmpegProcess.kill('SIGTERM');
    }
  }, 5000);
  setTimeout(() => {
    if (!ffmpegProcess.exitCode) {
      ffmpegProcess.kill('SIGKILL');
    }
  }, 10000);
}
