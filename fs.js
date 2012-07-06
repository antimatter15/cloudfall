
var Dropbox = require('dropbox/dropbox');
var db = new Dropbox('or24w0n6nhry4wf', '2wximhbmsuif05o');
var fs = null;

function abstractDirectoryContents(path, callback){
	if(browse_mode == 'dropbox'){
		db.getDirectoryContents(path, callback);	
	}else if(browse_mode == 'local'){
		getContents(path, function(items){
			var index = 0;
			var contents = [];
			function getMeta(){
				if(index < items.length){
					var file = items[index];
					file.getMetadata(function(e){
						contents.push({
							bytes: e.size,
							modified: e.modificationTime,
							size: bytesToSize(e.size),
							path: file.fullPath,
							is_dir: file.isDirectory
						})
						getMeta();
					})
				}else{
					callback({
						contents: contents
					})
				}
				index++;
			}
			getMeta();
		})
	}
}


function checkUnsynced(){
	var outofdate = []
	for(var i = 0; i < localStorage.length; i++){
		var k = localStorage.key(i);
		if(/^PathRev/.test(k)){
			var path = k.substr(7);
			var rev = localStorage.getItem(k);
			if(rev.indexOf('*') != -1 || /new/.test(rev)){
				outofdate.push(path)
			}
		}
	}
	return outofdate;
}


function abstractOpenFile(path){
	if(browse_mode == 'dropbox'){
		syncFile(path, function(path){
			openFile(path)
		})
	}else if(browse_mode == 'local'){
		openFile(path);	
	}
}


function abstractSaveFile(path, data, callback){
	displayOption('syncstate', 'uploading')
	displayOption('savestate', 'saving')

	var rev = localStorage.getItem('PathRev'+path);
	if(rev){
		var cleanrev = rev.replace(/\*/g, '');
		localStorage.setItem('PathRev'+path, rev + "*"); //add an asterisk for every time saved
		//it's been modified
	}else{
		localStorage.setItem('PathRev'+path, "new");
	}
	writeContents(path, convertToBlob(data), function(){
		if(callback) callback();
		uploadDropbox(path)
	});
}

function expeditedSave(path, data){
	writeContents(path, convertToBlob(data), function(){
		db.replaceFileContents(path, data, function(meta){
			console.log("replaced file contents", meta)
			localStorage.setItem('PathRev'+path, meta.rev);
		})
	});
}


function displayOption(parent, mode){
	var container = document.getElementById(parent)
	var imgs = container.querySelectorAll('img');
	for(var i = 0; i < imgs.length; i++){
		imgs[i].style.display = 'none'
	};
	container.getElementsByClassName(mode)[0].style.display = ''
}


var dropboxUploadQueue = {};

function uploadDropbox(path){
	if(path in dropboxUploadQueue){
		console.log("still processing something on this file, retry later.")
		
		if(new Date - dropboxUploadQueue[path] > 4000){
			delete dropboxUploadQueue[path];
		}else{
			return;	
		}	
	}
	dropboxUploadQueue[path] = +new Date;

	readContents(path, function(data){

		function resultHandler(meta){
			//localStorage.setItem('PathRev'+path, 'conflicted') //should be overwritten as follows
			//console.log("uploaded new revision", meta)
			
			localStorage.setItem('PathRev'+meta.path, meta.rev)
			delete dropboxUploadQueue[path];

			

			if(path != meta.path){
				displayOption('syncstate', 'conflict')
				console.log("Merge Conflict!");

				syncFile(path, function(){
					console.log("updated local cache for "+path)
				})
				//alert("There was a merge conflict, the new file is at "+meta.path+"")
				currentFile = meta.path;
				tabSessions[path].updatePath(meta.path);
				
				writeContents(meta.path, convertToBlob(data), function(){
					console.log("saved new stuff to new place")
				});
			}else{
				setTimeout(function(){
					displayOption('syncstate', 'uploaded')
				}, 200);
			}

			if(meta.path == currentFile){
				//if this file is currently being edited
				//fileSessions[path].latestSync = meta.rev;
				fileSessions[meta.path].latestSync = getLatestRevision(path);
			}
			
		}

		var rev = localStorage.getItem('PathRev'+path);
		if(rev && !/new/.test(rev)){
			var cleanrev = rev.replace(/\*/g, '');
			console.log("Updating existing file", path)
			db.updateFileContents(path, cleanrev, data, resultHandler)
		}else{
			console.log("Uploading for the first time", path)
			db.putFileContents(path, data, resultHandler);
		}	
	})
	
}

function getLatestRevision(path){
	return localStorage.getItem('PathRev'+path)
}


function syncFile(path, callback){
	db.getFileContents(path, function(data){
		db.getMetadata(path, function(meta){
			writeContents(path, convertToBlob(data), function(){
				callback(path);	
			})
			localStorage.setItem('PathRev'+path, meta.rev)
		})
	})
}


function blobConstructor(){
	try {
		return !!new Blob();
	}catch(e){
		return false;
	}
}

function convertToBlob(array){
	if(blobConstructor()){
		return new Blob([array])
	}else if(window.WebKitBlobBuilder){
		var bb = new WebKitBlobBuilder();
		bb.append(array);
		return bb.getBlob();
	}
}

function syncDirectory(path){
	console.log("Syncing directory", path)
	db.getDirectoryContents(path, function(stuff){
		stuff.contents.forEach(function(e){
			if(!e.is_dir){
				syncFile(e.path, function(path){
					console.log("Done saving", path)
				})
			}else if(e.path.substr(stuff.path.length) != "/.git"){
				syncDirectory(e.path)
			}
		})
	});
}


function toArray(list) {
  return Array.prototype.slice.call(list || [], 0);
}

function readContents(path, callback){
	getFile(path, function(e){
		e.file(function(file){
			var reader = new FileReader();
			reader.onloadend = function(){
				callback(reader.result);
			}
			reader.readAsText(file)
		})
	})
}

function createBackup(path, callback){
	
	var name = path.split('/').slice(-1).join('/');
	var backup = name + '.bak'
	var folder = path.split('/').slice(0, -1).join('/');
	getFile(folder + '/' + backup, function(temp){
		temp.remove(function(){
			getFile(path, function(existing){
				fs.root.getDirectory(folder, {create: false}, function(folder){
					existing.moveTo(folder, backup, function(){
						callback();
					}, errorHandler);
				}, errorHandler)
			})
		}, errorHandler);
	});
}


function abstractDeletePath(path, is_dir){
	if(is_dir){
		getDir(path, function(temp){
			temp.removeRecursively(function(){
				console.log("recursively removed local directory", path)
			})
		})
	}else{
		getFile(path, function(temp){
			temp.remove(function(){
				console.log("removed local version of ", path)
			});
		});	
	}
	
	db.deletePath(path, function(){
		console.log("removed remote version of ", path)
	})
}

function writeContents(path, blob, callback){
	/*
		1. Create backup file if not already existing
		2. Remove existing backup file
		3. Create file if not already existing
		4. Rename existing file
		5. Create file if not already existing
		6. Write to file

		I'll admit it's a tad redundant but it should hopefully be reliable
		which would be totally nonsensical but whatever.
	*/
	createBackup(path, function(){
		getFile(path, function(e){
			e.createWriter(function(fileWriter){
				fileWriter.onwriteend = function(){
					console.log("write done")
					
					if(callback) callback();
					setTimeout(function(){
						displayOption('savestate', 'saved')
					}, 200)
					
				}
				fileWriter.onerror = function(){
					console.log("error writing")
				}
				// var blob = null;
				// if(blobConstructor()){
				// 	blob = new Blob([text]);

				// }else{
				// 	var bb = new WebKitBlobBuilder();
				// 	bb.append(text)
				// 	blob = bb.getBlob('text/plain')
				// }
				fileWriter.write(blob)
			})
		})
	})
	
}


function getFile(path, callback){
	if(path[0] == "/") path = path.slice(1);
	
	var cmp = path.split('/');

	getDir(cmp.slice(0, -1).join('/'), function(dir){
		dir.getFile(cmp[cmp.length - 1], {create: true, exclusive: false}, function(file){
			callback(file)
		}, errorHandler)
	})
}

var hideBackupFiles = true;

function getContents(path, callback){
	getDir(path, function(dir){
		var dirReader = dir.createReader();
		var entries = [];
		var readEntries = function() {
			 dirReader.readEntries (function(results) {
			  if (!results.length) {
			    callback(entries.filter(function(e){
			    	if(/\.bak$/.test(e.name) && hideBackupFiles){
			    		return false
			    	}
			    	return true
			    }))
			  } else {
			    entries = entries.concat(toArray(results));
			    readEntries();
			  }
			}, errorHandler);
		};

		readEntries(); // Start reading dirs.

	})
}

function getDir(path, callback){
	if(path[0] == "/") path = path.slice(1);

	if(path == ''){
		return callback(fs.root)
	}
	var comp = path.split('/');
	var deps = comp.map(function(e, i){
		return comp.slice(0, i + 1).join('/')
	});
	var openDir = function(){
		fs.root.getDirectory(deps.shift(), {create: true, exclusive: false}, function(dir){
			if(deps.length == 0){
				callback(dir);
			}else{
				openDir();
			}
		}, errorHandler)	
	}
	openDir();
}

function onInitFs(f) {
  fs = f;
  console.log('Opened file system: ' + fs.name);

  	if(localStorage.lastOpenedFile){
  		currentPath = localStorage.lastOpenedFile.replace(/[^\/]*$/,'');
		openFile(localStorage.lastOpenedFile);
	}else{
		var fn = "/CloudFall-Introduction.txt";
		abstractSaveFile(fn, editor.getValue(), function(){
			openFile(fn)	
		});
	}
}

webkitRequestFileSystem(window.TEMPORARY, 100*1024*1024 , onInitFs, errorHandler);

function errorHandler(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  console.log('Error: ' + msg);
}

function bytesToSize(bytes)
{	
	var precision = 2;
	var kilobyte = 1024;
	var megabyte = kilobyte * 1024;
	var gigabyte = megabyte * 1024;
	var terabyte = gigabyte * 1024;
	
	if ((bytes >= 0) && (bytes < kilobyte)) {
		return bytes + ' B';

	} else if ((bytes >= kilobyte) && (bytes < megabyte)) {
		return (bytes / kilobyte).toFixed(precision) + ' KB';

	} else if ((bytes >= megabyte) && (bytes < gigabyte)) {
		return (bytes / megabyte).toFixed(precision) + ' MB';

	} else if ((bytes >= gigabyte) && (bytes < terabyte)) {
		return (bytes / gigabyte).toFixed(precision) + ' GB';

	} else if (bytes >= terabyte) {
		return (bytes / terabyte).toFixed(precision) + ' TB';

	} else {
		return bytes + ' bytes';
	}
}