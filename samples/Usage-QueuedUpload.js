var MultiPart = require("JSss")("com.something.test","MyAccessKey","mySecret","dirOnS3/fileOnS3.zip", { useSSL:true,dataIntegrityEnabled:true,rrsEnabled:false }),
    fs = require('fs'),
    functionQueue = require('function-queue') /*requires module 'function-queue' published on npm registry*/;
//Local ivars
var filepath = "/Users/user/fileToUpload.zip",
    partFinished = 0,
    waitingQueue = null;

//
MultiPart.on("jsss-end",function () { console.log("end"); });
MultiPart.on("jsss-error",function (err) { console.log(err); });
MultiPart.on("jsss-upload-notice",function (partNumber,status,err) {
  partFinished++;
    if (status == false) { 
      console.log("Finished upload " + partNumber + " with error: " + require('util').inspect(err) + "\n");
      console.log("Aborting..."); 
      MultiPart.abortUpload(); 
    } else { 
      console.log("Finished upload " + partNumber + " with success\n");
      waitingQueue(); /*next in upload queue*/ 
    }
});
//Must be registered to MultiPart API start
console.log("Requesting upload ID...\n");
MultiPart.on("jsss-ready",function () {
  console.log("Ready to upload, fetching file data...\n");
  //Reset ivars
  var uploadQueue = functionQueue();
  
  //Open file
  fs.open(filepath, 'r', function(err, fd) {
    abortOnError(err); //abort if error
    //get size of
    fs.fstat(fd, function(err2, stats) {
        abortOnError(err2); //abort if error
        var bufferSize=stats.size, chunkSize=(100*1024*1024) /*100MB in bits*/, bytesRead=0, chunkCount=0;
        console.log("Got file with size " + (bufferSize/1024/1024/1024) + "GB");
        //While we do not read all
        while (bytesRead < bufferSize) {
          chunkCount += 1;
          //Check if last chink is samller than allowed size
          if ((bytesRead + chunkSize) > bufferSize) { chunkSize = (bufferSize - bytesRead); }
          console.log("Queueing part " + chunkCount + " with size " + chunkSize/1024/1024 + "MB");
          //Queue upload
          uploadQueue.push(function (callback,arg) {
            var internalBytesRead = arg[0];
            var internalChunkCount = arg[1];
            var internalChunkSize = arg[2];
            var internalFd = arg[3];
            waitingQueue = callback;
            console.log("Part " + internalChunkCount + " starting upload...\n");
            //fill buffer
            var buffer=new Buffer(internalChunkSize);
            fs.readSync(internalFd, buffer, 0, internalChunkSize, internalBytesRead);
            //Request upload
            MultiPart.uploadChunk(buffer,internalChunkCount);
          },[bytesRead,chunkCount,chunkSize,fd]);
          bytesRead += chunkSize;
        }
        //Close upload
        uploadQueue.push(function (callback,arg) {
          var internalFd = arg[0];
          var internalChunkCount = arg[1];
          console.log("Uploaded " + internalChunkCount + " files, requesting file close..");
          fs.close(internalFd);
          MultiPart.finishUpload();
          callback();
        },[fd,chunkCount]);
    });
  });
});



function abortOnError(err) {
  if (err) { 
    console.log("Aborting due error " + err);
    MultiPart.abortUpload();
    return; 
  }
}