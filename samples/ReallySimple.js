var MultiPart = require("./src/JSss.js")("ohByBucket","MyAccessKey","mySecret","folde/theFileName.zip");
MultiPart.on("end",function () {
	console.log("end");	
});
MultiPart.on("error",function (err) {
	console.log(err);
	MultiPart.abortUpload();
});
//Upload successeded or finished
MultiPart.on("upload-notice",function (partNumber,status) {
	partFinished++;
	if (partFinished == partCount) {
		MultiPart.finishUpload();
	}
});
//Must be registered to MultiPart API start
MultiPart.on("ready",function () {
	console.log("ready");
	
	partFinished = 0;
	partCount = 2;
	//All datas need to be 5MB>
	MultiPart.uploadChunck("the big data",1);
	MultiPart.uploadChunck("the big data2",2);
});