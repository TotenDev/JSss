var MultiPart = require("./../src/JSss.js")("ohByBucket","MyAccessKey","mySecret","theFileName.zip");
MultiPart.on("jsss-end",function () {
	console.log("end");	
});
MultiPart.on("jsss-error",function (err) {
	console.log(err);	
//	//DO NOT ABORT HERE !! - SINCE ABORT CAN RESULT IN ERROR EVENT
//	MultiPart.abortUpload();
});
//Upload successeded or finished
MultiPart.on("jsss-upload-notice",function (partNumber,status) {
	partFinished++;
	if (partFinished == partCount) {
		MultiPart.finishUpload();
	}
});
//Must be registered to MultiPart API start
MultiPart.on("jsss-ready",function () {
	console.log("ready");
	
	partFinished = 0;
	partCount = 2;
	//All datas need to be 5MB>
	var a = new Buffer("the big data");
	MultiPart.uploadChunk(a,1);
	var b = new Buffer("the big data2");
	MultiPart.uploadChunk(b,2);
});