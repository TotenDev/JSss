var cyrpto = require('crypto'),
MultiPart  = require("./../src/JSss.js")("ohByBucket","MyAccessKey","mySecret","folde/theFileName.zip");

MultiPart.on("jsss-end",function () {
	console.log("end");	
});

MultiPart.on("jsss-error",function (err) {
	console.log("->",err);	
//	//DO NOT ABORT HERE !! - SINCE ABORT CAN RESULT IN ERROR EVENT
//	MultiPart.abortUpload();
});

//Upload successeded or finished
MultiPart.on("jsss-upload-notice",function (partNumber,status) {
	partFinished++;
	if (partFinished == partCount) {
		//we should check all uploads status, but it's an example !!
		if (status) { MultiPart.finishUpload(); }
		else { MultiPart.abortUpload(); }
	}
});

//Must be registered to MultiPart API start
MultiPart.on("jsss-ready",function () {
	console.log("ready");
	
	partFinished = 0;
	partCount = 2;
	//All datas need to be 5MB>
	
	var data1="Many hands make light work."
	var hash1=crypto.createHash('md5').update(data1).digest('base64')

	var data2="Good things come in small packages."
	var hash2=crypto.createHash('md5').update(data2).digest('base64')
	
	MultiPart.uploadChunk(data1,1,'utf8',hash1);
	MultiPart.uploadChunk(data2,2,'utf8',hash2);
});