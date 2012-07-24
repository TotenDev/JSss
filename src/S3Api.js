//
// S3Api.js — JSss
// today is 7/19/12, it is now 5:25 PM
// created by TotenDev
// see LICENSE for details.
//


//TODO 
//IMPLEMENT http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadUploadPartCopy.html
//Upload in other thread/child ?
//Stop uploads when aborting 
//Accept options in initialization with option object

//Preferences
var useSSL = true;
var endPoint = "s3.amazonaws.com";
//Imports
var AWSSign = require('aws-sign'),
	http = (useSSL ? require('https') : require('http')),
	util = require ('util'),
	xml2json = require("node-xml2json");

/**
* Initialize S3Api function
*
* @param string bucketID - Name of Object in S3 bucket   - REQUIRED
* @param string AWSAccessKeyID - AWS AccessKeyID         - REQUIRED
* @param string AWSSecretAccessKey - AWS SecretAccessKey - REQUIRED
**/
module.exports = function (bucketID,AWSAccessKeyID,AWSSecretAccessKey) { return new S3Api(bucketID,AWSAccessKeyID,AWSSecretAccessKey); }
function S3Api(_bucketID,_AWSAccessKeyID,_AWSSecretAccessKey) {
	bucketID = _bucketID;
	credentials = (_AWSAccessKeyID && _AWSSecretAccessKey ? { accessKeyId: _AWSAccessKeyID, secretAccessKey:_AWSSecretAccessKey } : null);
}

/**
* Initialize Multipart upload
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadInitiate.html
*
* @param string objectName - Name of Object in S3 bucket - REQUIRED
* @param function callback(suc,resp) - callback function called in result - OPTIONAL
* @param boolean callback.suc - indicate a success or fail - OPTIONAL
* @param string callback.resp - response - OPTIONAL
* @param boolean dryResp - indicates a full response or a dry with the uploadID only in callback.resp. Defaults is false. - OPTIONAL
**/
S3Api.prototype.multipartInitiateUpload = function multipartInitiateUpload(objectName,callback,dryResp) {
	//Checks
	if (!objectName) { 
		var errorStr="objectName *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	}
	
	//Helps
	var connectionPath = encodeURI( '/' + objectName + '?uploads' );
	var connectionMethod = 'POST';
	//Make request
	S3Api.simpleRequest(200,connectionPath,connectionMethod,function (suc,resp) {
		//Successed
		if (suc) {
			//with callback
			if (callback) {
				//check for dry response
				if (dryResp && dryResp == true) {
					var uploadID = resp["initiatemultipartuploadresult"]["uploadid"];
					if (resp && uploadID && uploadID.length > 0) { callback(true,uploadID); }
					else { callback(false,"Couldn't decode AWS initial uploadID XML response."); }
					return;
				}else { callback(true,resp); return; }
			}
		}
		//errored, but with callback
		else if (callback) { callback(false,resp); }
		//errored without callback
		else { console.error(resp); } 
		return;
	});
}

/**
* Upload Chunk
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadUploadPart.html
*
* @param string objectName - Name of Object in S3 bucket - REQUIRED
* @param string uploadID - UploadID received from amazon (Upload Unique Identifier) - REQUIRED
* @param integer partNumber - Upload part number - REQUIRED
* @param Buffer data - Data to be uploaded - REQUIRED
* @param function callback(suc,resp) - callback function called in result - OPTIONAL
* @param boolean callback.suc - indicate a success or fail - OPTIONAL
* @param string callback.resp - response - OPTIONAL
* @param boolean dryResp - indicates a full response headers or a dry with the Upload ETag only in callback.resp. Defaults is false. - OPTIONAL
**/
S3Api.prototype.multipartUploadChunk = function multipartUploadChunk(objectName,uploadID,partNumber,upBuf,callback,dryResp) {
	//Checks
	if (!objectName) { 
		var errorStr="objectName *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!uploadID) { 
		var errorStr="uploadID *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!partNumber) { 
		var errorStr="partNumber *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!upBuf) { 
		var errorStr="upBuf *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!Buffer.isBuffer(upBuf)) { 
		var errorStr="upBuf is not a Buffer object, it should be;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	}
	
	//Helps
	var connectionPath = encodeURI( '/' + objectName + '?partNumber=' + partNumber + '&uploadId=' + uploadID );
	var connectionMethod = 'PUT';
	
	//Make request
	S3Api.simpleRequest(200,connectionPath,connectionMethod,function (suc,resp,headers) {
		//Successed
		if (suc) {
			//with callback
			if (callback) {
				//check for dry response
				if (dryResp && dryResp == true) {
					var eTag = headers["etag"];
					if (headers && eTag && eTag.length > 0) { callback(true,eTag); }
					else { callback(false,"Couldn't decode AWS eTag XML response."); } 
					return;
				}else { callback(true,headers); return; }
			}
		}
		//errored, but with callback
		else if (callback) { callback(false,resp); }
		//errored without callback
		else { console.error(resp); } 
		return;
	},upBuf);
}

/**
* List Parts Multipart upload
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadListParts.html
*
* @param string objectName - Name of Object in S3 bucket - REQUIRED
* @param string uploadID - UploadID received from amazon (Upload Unique Identifier) - REQUIRED
* @param function callback(suc,resp) - callback function called in result - OPTIONAL
* @param boolean callback.suc - indicate a success or fail - OPTIONAL
* @param string callback.resp - response - OPTIONAL
**/
S3Api.prototype.multipartListPartsUpload = function multipartListPartsUpload(objectName,uploadID,callback) {
	//Checks
	if (!objectName) { 
		var errorStr="objectName *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!uploadID) { 
		var errorStr="uploadID *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	}
	
	//Helps
	var connectionPath = encodeURI( '/' + objectName + '?uploadId=' + uploadID );
	var connectionMethod = 'GET';
	//Make request
	S3Api.simpleRequest(200,connectionPath,connectionMethod,function (suc,resp) {
		//Successed
		if (suc) {
			//with callback
			if (callback) { callback(true,resp);  }
		}
		//errored, but with callback
		else if (callback) { callback(false,resp); }
		//errored without callback
		else { console.error(resp); } 
		return;
	});
}

/**
* Abort Multipart upload
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadAbort.html
*
* @param string objectName - Name of Object in S3 bucket - REQUIRED
* @param string uploadID - UploadID received from amazon (Upload Unique Identifier) - REQUIRED
* @param function callback(suc,resp) - callback function called in result - OPTIONAL
* @param boolean callback.suc - indicate a success or fail - OPTIONAL
* @param string callback.resp - response - OPTIONAL
**/
S3Api.prototype.multipartAbortUpload = function multipartAbortUpload(objectName,uploadID,callback) {
	//Checks
	if (!objectName) { 
		var errorStr="objectName *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!uploadID) { 
		var errorStr="uploadID *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	}
	
	//Helps
	var connectionPath = encodeURI( '/' + objectName + '?uploadId=' + uploadID );
	var connectionMethod = 'DELETE';
	//Make request
	S3Api.simpleRequest(204,connectionPath,connectionMethod,function (suc,resp) {
		//Successed
		if (suc) {
			//with callback
			if (callback) { callback(true,resp);  }
		}
		//errored, but with callback
		else if (callback) { callback(false,resp); }
		//errored without callback
		else { console.error(resp); } 
		return;
	});
}

/**
* Complete Multipart upload
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadComplete.html
*
* @param string objectName - Name of Object in S3 bucket - REQUIRED
* @param string uploadID - UploadID received from amazon (Upload Unique Identifier) - REQUIRED
* @param array partsRef - Should be all part reference in array, with part number and etag as `[{PartNumber:1,ETag:009},{PartNumber:2,ETag:007}]` - REQUIRED
* @param function callback(suc,resp) - callback function called in result - OPTIONAL
* @param boolean callback.suc - indicate a success or fail - OPTIONAL
* @param string callback.resp - response - OPTIONAL
**/
S3Api.prototype.multipartCompleteUpload = function multipartCompleteUpload(objectName,uploadID,partsRef,callback) {
	//Checks
	if (!objectName) { 
		var errorStr="objectName *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!uploadID) { 
		var errorStr="uploadID *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	} else if (!partsRef) { 
		var errorStr="partsRef *REQUIRED* parameter is missing;"; 
		if (callback) { callback(false,errorStr); }else{ console.error(errorStr); } 
		return; 
	}
	
	//Helps
	var connectionPath = encodeURI( '/' + objectName + '?uploadId=' + uploadID );
	var connectionMethod = 'POST';
	//Format Body
	var bodyData = S3Api.formatCompleteBodyXML(partsRef);
	if (bodyData) {
		//Make request
		S3Api.simpleRequest(200,connectionPath,connectionMethod,function (suc,resp) {
			//Successed
			if (suc) {
				//with callback
				if (callback) { callback(true,resp);  }
			}
			//errored, but with callback
			else if (callback) { callback(false,resp); }
			//errored without callback
			else { console.error(resp); } 
			return;
		},bodyData);	
	}
	else {
		//errored, but with callback
		var errMsg = "Couldn't format bodyData XML from partRefs.";
		if (callback) { callback(false,errMsg); }
		else { console.error(errMsg); } 
		return;
	}
}








/**
* Simple AWS Request (Should be used for all AWS requests)
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/dev/MakingRequests.html
*
* @param integer _successStatusCode - Which StatusCode will raise on success - REQUIRED
* @param string _connectionPath - ConnectionPath as "/AmazonS3/latest/dev/MakingRequests.html" - REQUIRED
* @param string _connectionMethod - ConnectionMethod as "POST" - REQUIRED
* @param function callback(suc,resp,headers) - callback function called in result - OPTIONAL
* @cb-param boolean callback.suc - indicate a success or fail - OPTIONAL
* @cb-param string callback.resp - response already in JSON format or not if request is errored - OPTIONAL
* @cb-param string callback.headers - response headers - OPTIONAL
* @param buffer bodyBuffer - Body Data - OPTIONAL
**/
S3Api.simpleRequest = function simpleRequest(_successStatusCode,_connectionPath,_connectionMethod,callback,bodyBuffer) {
	//Helps
	var connectionPath = _connectionPath;
	var connectionMethod = _connectionMethod;
	var connectionDate = new Date().toUTCString();
	var connectionHost  = bucketID + "." + endPoint;
	//format connection options
	var connectionOptions = { host: connectionHost, port: (useSSL ? 443 : 80), path: connectionPath, method: connectionMethod };
	
	//Format Headers
	var headers = {};
	headers['Date'] = connectionDate ;
	//BodyBuffer ?
	if (bodyBuffer) { headers['Content-Length'] = bodyBuffer.length; }
	//Get signer
	if (credentials) { 
		var auth = new AWSSign(credentials).sign({ method: connectionMethod, bucket: bucketID, path: connectionPath, date: connectionDate }); 
		if (auth && auth.length > 0) { headers['Authorization'] = auth; }
	}
	//Set request headers
	connectionOptions["headers"] = headers;
	var requestResponded = false;
	//Request to endpoint
	var req = http.request(connectionOptions,function (res) {
		res.setEncoding('utf8');
		//Response chunks
		var mutableData = "";
		res.on("data",function (chunk) { mutableData += chunk ; });
		//Response end
		res.on("end",function () {
			//Check if already responded
			if (!requestResponded) { requestResponded = true; }
			else { return ; }
			//Get Json value
			var JSONValue = xml2json.parser(mutableData);
			//Switch between accepted status code and non accpeteds
			switch (res.statusCode) {
				case _successStatusCode: {
					//Success
					if (callback) {
						if (JSONValue) { 
							//Check if status code is okay, but have error root object in XML indicating an error (AWS typical behavior)
							if (JSONValue["Error"]||JSONValue["error"]) { callback(false,JSONValue,res.headers); }
							else { callback(true,JSONValue,res.headers);  }
						}else { callback(true,null,res.headers); }
						return;
					}
				} break;
				default: {
					//Error
					console.error("Error statusCode:" + res.statusCode);
					if (callback) { callback(false,JSONValue,res.headers); }else { console.error(JSONValue); }
					return;
				} break;
			}
		});
	});
	
	//Response error
	req.on("error",function (err) {
		//Check if already responded
		if (!requestResponded) { requestResponded = true; }
		else { return ; }
		//Error
		var errMsg = "Request errored: " + err;
		if (callback) { callback(false,errMsg,null); }else { console.error(errMsg); }
		return;
	});
	//write data if needed
	if (bodyBuffer) { req.write(bodyBuffer); }
	//finish connection request
	req.end();
}
/**
* Format AWS Complete Upload Body (Should be used for all MultipartCompleteUpload request)
*
* Amazon Docs: http://docs.amazonwebservices.com/AmazonS3/latest/API/mpUploadComplete.html
*
* @param array partsRef - Should be all part reference in array, with part number and etag as `[{PartNumber:1,ETag:009},{PartNumber:2,ETag:007}]` - REQUIRED
**/
S3Api.formatCompleteBodyXML = function formatCompleteBodyXML(partsRef) {
	var xmlBodyString = "";
	for (var i = 0; i < partsRef.length; i++) {
		xmlBodyString += "<Part><PartNumber>" + partsRef[i]["PartNumber"] + "</PartNumber><ETag>" + partsRef[i]["ETag"] + "</ETag></Part>";
	}
	//Check if have body, closes XML string with 'CompleteMultipartUpload' key as below
	if (partsRef.length > 0 && xmlBodyString && xmlBodyString.length > 0) { 
		xmlBodyString = "<CompleteMultipartUpload>" + xmlBodyString + "</CompleteMultipartUpload>"; 
		return xmlBodyString;
	}
	return null;
}