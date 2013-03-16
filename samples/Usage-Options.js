var MultiPart = require("./../src/JSss.js")("ohByBucket","MyAccessKey","mySecret","folde/theFileName.zip",{ endPoint:"secondary.s3.com",useSSL:false,dataIntegrityEnabled:false,rrsEnabled:false });
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
	MultiPart.uploadChunk("the big data",1);
	MultiPart.uploadChunk("the big data2",2);
});