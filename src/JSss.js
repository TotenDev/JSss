//
// JSss.js — JSss
// today is 7/10/12, it is now 5:25 PM
// created by TotenDev
// see LICENSE for details.
//

var util = require ('util'),
	inherits = require('util').inherits,
	EventEmitter = require('events').EventEmitter;
	
/**
* Initialize JSss function
*
* @param string bucketID - Name of Object in S3 bucket   - REQUIRED
* @param string AWSAccessKeyID - AWS AccessKeyID         - REQUIRED
* @param string AWSSecretAccessKey - AWS SecretAccessKey - REQUIRED
* @param string fileName - fileName to be on S3          - REQUIRED
**/
module.exports = function (bucketID,AWSAccessKeyID,AWSSecretAccessKey,fileName) { return new JSss(bucketID,AWSAccessKeyID,AWSSecretAccessKey,fileName); }
function JSss(_bucketID,_AWSAccessKeyID,_AWSSecretAccessKey,fileName) {
	//JSssObject
	JSssObject = this ;
	//Checks
	if (!_bucketID) {
		var errMsg = "_bucketID *REQUIRED* parameter is missing;";
		console.error(errMsg);
		JSssObject.emit("error",errMsg);/*stills emitting error, so an exception will be raise*/
		JSssObject.emit("jsss-end");
		return;
	}else if (!_AWSAccessKeyID) {
		var errMsg = "_AWSAccessKeyID *REQUIRED* parameter is missing;";
		console.error(errMsg);
		JSssObject.emit("error",errMsg);/*stills emitting error, so an exception will be raise*/
		JSssObject.emit("jsss-end");
		return;
	}else if (!_AWSSecretAccessKey) {
		var errMsg = "_AWSSecretAccessKey *REQUIRED* parameter is missing;";
		console.error(errMsg);
		JSssObject.emit("error",errMsg);/*stills emitting error, so an exception will be raise*/
		JSssObject.emit("jsss-end");
		return;
	}else if (!fileName) {
		var errMsg = "fileName *REQUIRED* parameter is missing;";
		console.error(errMsg);
		JSssObject.emit("error",errMsg); /*stills emitting error, so an exception will be raise*/
		JSssObject.emit("jsss-end");
		return;
	}
	
	//Get API
	JSssObject.fileName = fileName;
	JSssObject.uploadChunks = [];
	JSssObject.S3Api = require("./S3Api.js")(_bucketID,_AWSAccessKeyID,_AWSSecretAccessKey);
	//AddListener newListener 
	JSssObject.addListener("newListener",function (event,listFunction) {
		switch (event) {
			case "jsss-ready":{ this.getReady(); } break;
			default: {} break;
		}
	});
};
//inherits to EventEmitter
inherits(JSss, EventEmitter);

/**
* Get ready JSss function (is called when ready listener is attached) - so do not call this directly
* It try to get new upID from amazon
**/
JSss.prototype.getReady = function getReady() {
	//Try to get upload id already formated 
	JSssObject.S3Api.multipartInitiateUpload(JSssObject.fileName,function (suc,initUpResp) {
		if (suc) { 
			JSssObject.uploadID = initUpResp;
			JSssObject.emit("jsss-ready"/*,JSssObject.uploadID*/); 
		} else {
			JSssObject.emit("jsss-error",initUpResp);
			JSssObject.emit("jsss-end");
		}
	},true);	
};

/**
* Upload Chunk function 
* (notice this function will not call error listener, it will call upload-notice listener with positionChuck parameter and if succeeded or not.)
*
* @param string chunkData - Chunk to be uploaded - REQUIRED
* @param number chunkPosition - Chunk Position, so you can upload multiple parts at same time - REQUIRED
**/
JSss.prototype.uploadChunk = function uploadChunk(chunkData,chunkPosition) {
	JSssObject.S3Api.multipartUploadChunk(JSssObject.fileName,JSssObject.uploadID,chunkPosition,chunkData,function (suc,eTag) {
		if (suc) {
			JSssObject.uploadChunks.push({PartNumber:chunkPosition,ETag:eTag});
			JSssObject.emit("jsss-upload-notice",chunkPosition,true);
		}else { JSssObject.emit("jsss-upload-notice",chunkPosition,false); }
	},true);	
};
/**
* Abort multipart upload function 
* It'll cancel upload, and delete all uploaded chunks.
**/
JSss.prototype.abortUpload = function abortUpload() {
	JSssObject.S3Api.multipartAbortUpload(JSssObject.fileName,JSssObject.uploadID,function (suc,respString) {
		if (!suc) { JSssObject.emit("jsss-error",respString); }
		JSssObject.emit("jsss-end");
	});
};
/**
* Finish multipart upload function 
* This method will finish upload, and can take a bit long for large files, 
* since amazon will only answer the request when all parts are together.
**/
JSss.prototype.finishUpload = function finishUpload() {
	//Sort chunks by partNumber
	JSssObject.uploadChunks.sort(function(a,b){
		if (a.PartNumber < b.PartNumber) { return false; }
		return true;
	});
	//Upload
	JSssObject.S3Api.multipartCompleteUpload(JSssObject.fileName,JSssObject.uploadID,JSssObject.uploadChunks,function (suc,respString) {
		if (!suc) { JSssObject.emit("jsss-error",respString); }
		JSssObject.emit("jsss-end");
	});
};