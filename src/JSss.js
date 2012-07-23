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
	//self
	self = this ;
	//Checks
	if (!_bucketID) {
		self.emit("error","_bucketID *REQUIRED* parameter is missing;")
		self.emit("end");
		return;
	}else if (!_AWSAccessKeyID) {
		self.emit("error","_AWSAccessKeyID *REQUIRED* parameter is missing;")
		self.emit("end");
		return;
	}else if (!_AWSSecretAccessKey) {
		self.emit("error","_AWSSecretAccessKey *REQUIRED* parameter is missing;")
		self.emit("end");
		return;
	}else if (!fileName) {
		self.emit("error","fileName *REQUIRED* parameter is missing;")
		self.emit("end");
		return;
	}
	
	//Get API
	self.fileName = fileName;
	self.uploadChuncks = [];
	self.S3Api = require("./S3Api.js")(_bucketID,_AWSAccessKeyID,_AWSSecretAccessKey);
	//AddListener newListener 
	self.addListener("newListener",function (event,listFunction) {
		switch (event) {
			case "ready":{ this.getReady(); } break;
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
	self.S3Api.multipartInitiateUpload(self.fileName,function (suc,initUpResp) {
		if (suc) { 
			self.uploadID = initUpResp;
			self.emit("ready"/*,self.uploadID*/); 
		} else {
			self.emit("error",initUpResp);
			self.emit("end");
		}
	},true);	
};

/**
* Upload Chunck function 
* (notice this function will not call error listener, it will call upload-notice listener with positionChuck parameter and if succeeded or not.)
*
* @param string chunckData - Chunck to be uploaded - REQUIRED
* @param number chunckPosition - Chunck Position, so you can upload multiple parts at same time - REQUIRED
**/
JSss.prototype.uploadChunck = function uploadChunck(chunckData,chunckPosition) {
	self.S3Api.multipartUploadChunck(self.fileName,self.uploadID,chunckPosition,chunckData,function (suc,eTag) {
		if (suc) {
			self.uploadChuncks.push({PartNumber:chunckPosition,ETag:eTag});
			self.emit("upload-notice",chunckPosition,true);
		}else { self.emit("upload-notice",chunckPosition,false); }
	},true);	
};
/**
* Abort multipart upload function 
* It'll cancel upload, and delete all uploaded chuncks.
**/
JSss.prototype.abortUpload = function abortUpload() {
	self.S3Api.multipartAbortUpload(self.fileName,self.uploadID,function (suc,respString) {
		if (!suc) { self.emit("error",respString); }
		self.emit("end");
	});
};
/**
* Finish multipart upload function 
* This method will finish upload, and can take a bit long for large files, 
* since amazon will only answer the request when all parts are together.
**/
JSss.prototype.finishUpload = function finishUpload() {
	//Sort chuncks by partNumber
	self.uploadChuncks.sort(function(a,b){
		if (a.PartNumber < b.PartNumber) { return false; }
		return true;
	});
	//Upload
	self.S3Api.multipartCompleteUpload(self.fileName,self.uploadID,self.uploadChuncks,function (suc,respString) {
		if (!suc) { self.emit("error",respString); }
		self.emit("end");
	});
};