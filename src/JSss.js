//
// JSss.js — JSss
// today is 7/10/12, it is now 5:25 PM
// created by TotenDev
// see LICENSE for details.
//

var util = require ('util'),
	inherits = util.inherits,
	EventEmitter = require('events').EventEmitter,
	debug = (process.argv.indexOf('--debug') != -1 ? console.error : function () {});
	
/**
* Initialize JSss function
*
* @param string bucketID - Name of Object in S3 bucket   - REQUIRED
* @param string AWSAccessKeyID - AWS AccessKeyID         - REQUIRED
* @param string AWSSecretAccessKey - AWS SecretAccessKey - REQUIRED
* @param string fileName - fileName to be on S3          - REQUIRED
* @param Object options - options object 		         - OPTIONAL
* @param string options.endPoint - End point to be used, default `s3.amazonaws.com` - OPTIONAL
* @param bool options.useSSL - Use SSL or not, default is true - OPTIONAL
**/
module.exports = function (bucketID,AWSAccessKeyID,AWSSecretAccessKey,fileName,options) { return new JSss(bucketID,AWSAccessKeyID,AWSSecretAccessKey,fileName,options); }
function JSss(_bucketID,_AWSAccessKeyID,_AWSSecretAccessKey,fileName,options) {
	//Checks
	if (!_bucketID) {
		var errMsg = "*JSss* _bucketID *REQUIRED* parameter is missing;";
		debug(errMsg);
		this.emit("error",errMsg);/*stills emitting error, so an exception will be raise*/
		this.emit("jsss-end");
		return;
	}else if (!_AWSAccessKeyID) {
		var errMsg = "*JSss* _AWSAccessKeyID *REQUIRED* parameter is missing;";
		debug(errMsg);
		this.emit("error",errMsg);/*stills emitting error, so an exception will be raise*/
		this.emit("jsss-end");
		return;
	}else if (!_AWSSecretAccessKey) {
		var errMsg = "*JSss* _AWSSecretAccessKey *REQUIRED* parameter is missing;";
		debug(errMsg);
		this.emit("error",errMsg);/*stills emitting error, so an exception will be raise*/
		this.emit("jsss-end");
		return;
	}else if (!fileName) {
		var errMsg = "*JSss* fileName *REQUIRED* parameter is missing;";
		debug(errMsg);
		this.emit("error",errMsg); /*stills emitting error, so an exception will be raise*/
		this.emit("jsss-end");
		return;
	}
	
	//Get API
	this.fileName = fileName;
	this.uploadChunks = [];
	this.S3Api = require("./S3Api.js")(_bucketID,_AWSAccessKeyID,_AWSSecretAccessKey,options);
	//AddListener newListener 
	this.addListener("newListener",function (event,listFunction) {
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
	var thisRef = this;
	this.S3Api.multipartInitiateUpload(this.fileName,function (suc,initUpResp) {
		if (suc) { 
			thisRef.uploadID = initUpResp;
			thisRef.emit("jsss-ready"/*,thisRef.uploadID*/); 
		} else {
			thisRef.emitOnce("jsss-error",initUpResp);
			thisRef.emitOnce("jsss-end");
		}
	},true);	
};

/**
* Upload Chunk function 
* (notice this function will not call error listener, it will call upload-notice listener with positionChuck parameter and if succeeded or not.)
*
* @param string|data|Buffer chunkData - Chunk to be uploaded - REQUIRED
* @param number chunkPosition - Chunk Position, so you can upload multiple parts at same time - REQUIRED
* @param string fileEncoding - Which enconding to use when uploading. Default is `utf8` - OPTIONAL
**/
JSss.prototype.uploadChunk = function uploadChunk(chunkData,chunkPosition,fileEncoding) {
	//Upload
	var thisRef = this;
	this.S3Api.multipartUploadChunk(this.fileName,this.uploadID,chunkPosition,chunkData,function (suc,eTag) {
		if (suc) {
			thisRef.uploadChunks.push({PartNumber:chunkPosition,ETag:eTag});
			thisRef.emit("jsss-upload-notice",chunkPosition,true);
		}else { thisRef.emit("jsss-upload-notice",chunkPosition,false); }
	},true, (fileEncoding ? fileEncoding : 'utf8'));	
};
/**
* Abort multipart upload function 
* It'll cancel upload, and delete all uploaded chunks.
**/
JSss.prototype.abortUpload = function abortUpload() {
	var thisRef = this;
	//Abort upload, this will erase all uploaded files
	this.S3Api.multipartAbortUpload(this.fileName,this.uploadID,function (suc,respString) {
		if (!suc) { thisRef.emitOnce("jsss-error",respString); }
		thisRef.emitOnce("jsss-end");
	});
};
/**
* Finish multipart upload function 
* This method will finish upload, and can take a bit long for large files, 
* since amazon will only answer the request when all parts are together.
**/
JSss.prototype.finishUpload = function finishUpload() {
	//Sort chunks by partNumber
	var thisRef = this;
	this.uploadChunks.sort(function(a,b){
		if (a.PartNumber < b.PartNumber) { return false; }
		return true;
	});
	//Complete multipart (Amazon will merge all parts on this request
	this.S3Api.multipartCompleteUpload(this.fileName,this.uploadID,this.uploadChunks,function (suc,respString) {
		if (!suc) { this.emitOnce("jsss-error",respString); }
		this.emitOnce("jsss-end");
	});	
};

/**
* It'll emit and remove listener after it
**/
JSss.prototype.emitOnce = function emitOnce(event) {
	//Emit
	this.emit.apply(this,arguments);
	//remove listener
	this.removeAllListeners(event);
};