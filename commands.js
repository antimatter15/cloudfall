var currentFile = '';
var currentPath = '';
var currentDirectory = null;

var commands = editor.commands;

commands.addCommand({
	name: "save",
	bindKey: {win: "Ctrl-S", mac: "Command-S"},
	exec: function() {
		if(currentFile){
			var data = editor.getValue();
			var path = currentFile;
			abstractSaveFile(path, data, function(){
				fileSessions[path].latestSync = getLatestRevision(path);
			});
			autoBuild(path, data)
		}
			

	}
});


HTMLElement.prototype.toggleClass = function(className, value){
	var classes = this.className.split(' ').filter(function(e){
		return e != className
	});
	if(value) classes.push(className);
	this.className = classes.join(' ');
}


var lastWordCount = 0;
var lastWordTime = 0;
var wpmWindow = [];
var wpmWindowSize = 7;

function updateWordCount(){
    var body  = editor.session.getTextRange(editor.getSelectionRange()) || editor.getValue()
    var parts = body.split(/\s/g).filter(function(word){
        return !/^\d+$/.test(word) && /^\w+$/.test(word)
    });
    var count = parts.length;
    
    var xcount = parts.join('').length / 5; //define a word as five characters
    var tdelta = (new Date - lastWordTime);
    var wdelta = xcount - lastWordCount;

    if(lastWordCount > 0 && tdelta > 0){
    	var wpm = wdelta/(tdelta/1000/60);
    	if(wpm > 10 && wpm < 250){
    		//moving average?
    		if(wpmWindow.length > wpmWindowSize){
    			wpmWindow.shift();
    		}
    		wpmWindow.push(wpm)
    	}
    }
    

    lastWordCount = xcount;
    lastWordTime = +new Date;
    document.getElementById('wordcount').innerText = count + ' words ';
    if(wpmWindow.length > wpmWindowSize){
    	for(var i = 0, s = 0; i < wpmWindow.length; i++){
			s += wpmWindow[i];
		}
		var avg = s / wpmWindow.length;
		document.getElementById('wordcount').innerText += Math.round(avg) + ' wpm';
    }
}

setInterval(updateWordCount, 762);



commands.addCommand({
    name: "nexttab",
    bindKey: {win: "Ctrl-Tab", mac: "Command-Tab"},
    exec: function(){
        getTabAt(1, true).click()
    }
})


commands.addCommand({
    name: "prevtab",
    bindKey: {win: "Ctrl-Shift-Tab", mac: "Command-Shift-Tab"},
    exec: function(){
        getTabAt(-1, true).click()
    }
})


function closeSession(path){
	if((path in tabSessions) && (path in fileSessions)){
		if(document.getElementById('tabbar').children.length <= 1){
			console.warn("can not close last remaining session")
			return; //can not close last remaining session
		}
		if(path == currentFile){
			getTabAt(1, true).click(); //switch to another tab if this focused
		}
		console.log("closing path", path)
		document.getElementById('tabbar').removeChild(tabSessions[path].el);
		delete tabSessions[path];
		delete fileSessions[path];	
	}
	
}

function getTabAt(index, relative){
    var c = document.getElementById('tabbar').children
    var children = [];
    var current = -1;
    for(var i = 0; i < c.length; i++){
        for(var j in tabSessions){
            if(tabSessions[j].el == c[i]){
                if(j == currentFile){
                    current = children.length;
                }
                children.push(tabSessions[j]);
                break;
            }
        }
    }
    if(relative) index += current;
    return children.slice(index % children.length)[0] //not terribly efficient but whatevs
}

function autoBuild(path, data){
	document.getElementById('build').style.display = '';
	displayOption('build', 'building')
	setTimeout(function(){
		if(modesByName.coffee.test(path)){
			try{
				var compiled = CoffeeScript.compile(data, {bare: true});
				displayOption('build', 'built')
			}catch(err){
				displayOption('build', 'buildfail')
				console.error(err);

			}
			//TODO: handle alternative extensions as well
			expeditedSave(path.replace(".coffee",".js"), compiled)
		}else if(modesByName.less.test(path)){
			var parser = new(less.Parser);
			parser.parse(data, function (err, tree) {
			    if (err) {
			    	displayOption('build', 'buildfail')
			    	return console.error(err)
			    }else{
			    	//TODO: some cleaner way of doing this
			    	displayOption('build', 'built')
			    }
			    var compiled = tree.toCSS();
			    expeditedSave(path.replace(".less", ".css"), compiled);
			});
		}/*else if(modesByName.markdown.test(path)){
			var html = markdown.toHTML(data);
			//never actually considered the fact that there might be different file names, well too bad

			//I don't know if it's possible to get markdown to throw an error
			expeditedSave(path.replace(".md", ".html"))
		}*/else{
			console.log("resetting", path)
			RAWR = path
			document.getElementById('build').style.display = 'none';
		}
	}, 100)

}

commands.addCommand({
	name: "palette",
	bindKey: {win: "Ctrl-P", mac: "Command-P"},
	exec: function(editor) {
		displayPalette('command');
	}
});

commands.addCommand({
	name: "palette2",
	bindKey: {win: "Ctrl-Shift-P", mac: "Command-Shift-P"},
	exec: function(editor) {
		displayPalette('command');
	}
});

commands.addCommand({
	name: "files",
	bindKey: {win: "Ctrl-O", mac: "Command-O"},
	exec: function(editor) {
		displayPalette('file');
	}
});


commands.addCommand({
	name: "find",
	bindKey: {win: "Ctrl-F", mac: "Command-F"},
	exec: function(editor, needle) {
		if (typeof needle == "object") {
			//var arg = this.name + " " + editor.getCopyText()
			//editor.cmdLine.setValue(arg, 1)
			//editor.cmdLine.focus()
			displayPalette('search', editor.getCopyText());
			return
		}
		editor.find(needle);
	},
	readOnly: true
})


commands.addCommand({
	name: "escape",
	bindKey: {win: "Esc", mac: "Esc"},
	exec: function(editor) {
		document.getElementById("command").style.display = "none";
		editor.focus();
	}
});

commands.addCommand({
	name: "gotoline",
	bindKey: {win: "Ctrl-L", mac: "Command-L"},
	exec: function(editor, line) {
		var arg = ":" + editor.getCursorPosition().row;
		displayPalette('search', arg);
		return
	},
	readOnly: true
})




var event = require("ace/lib/event");

var themes = {
	"chrome": "Chrome",
	"clouds": "Clouds",
	"clouds_midnight": "Clouds Midnight",
	"cobalt": "Cobalt",
	"crimson_editor": "Crimson Editor",
	"dawn": "Dawn",
	"dreamweaver": "Dreamweaver",
	"eclipse": "Eclipse",
	"idle_fingers": "idleFingers",
	"kr_theme": "krTheme",
	"merbivore": "Merbivore",
	"merbivore_soft": "Merbivore Soft",
	"mono_industrial": "Mono Industrial",
	"monokai": "Monokai",
	"pastel_on_dark": "Pastel on dark",
	"solarized_dark": "Solarized Dark",
	"solarized_light": "Solarized Light",
	"textmate": "TextMate",
	"twilight": "Twilight",
	"tomorrow": "Tomorrow",
	"tomorrow_night": "Tomorrow Night",
	"tomorrow_night_blue": "Tomorrow Night Blue",
	"tomorrow_night_bright": "Tomorrow Night Bright",
	"tomorrow_night_eighties": "Tomorrow Night 80s",
	"vibrant_ink": "Vibrant Ink",
	"ambiance": "Ambiance"
};

var actions = []
function addAction(name, action, preview){
	actions.push([name, action, preview]);
}

for(var name in modesByName){
	(function(name){
		addAction("Set Syntax: "+modesByName[name].desc, function(){
			editor.getSession().setMode("ace/mode/"+name);
		})
	})(name)
}

for(var name in themes){
	(function(name){
		addAction("Set Theme: "+themes[name], function(){
			editor.setTheme("ace/theme/"+name);
			updateTheme();
		})
	})(name)
}

[6, 9, 10, 11, 12, 14, 16, 18, 24].forEach(function(size){
	addAction("Set Font Size: "+size+"px", function(){
		editor.setFontSize(size+"px");
	})
});


[2, 4, 8, 16].forEach(function(size){
	addAction("Set Tab Size: "+size, function(){
		editor.getSession().setTabSize(size);
	})
})

addAction("Soft Tabs: off", function(){
	editor.getSession().setUseSoftTabs(false)
})


addAction("Soft Tabs: on", function(){
	editor.getSession().setUseSoftTabs(true);
})

addAction("Update Word Count", updateWordCount);

addAction("Convert Tabs to Spaces", function(){
    editor.setValue(editor.getValue().replace(/\t/g, editor.getSession().getTabString()));
})

addAction("Word Wrap: off", function(){
	editor.getSession().setUseWrapMode(false);
	//editor.getSession().setWrapLimitRange(null, null);
	//renderer.setPrintMarginColumn(80);
})
addAction("Word Wrap: 40", function(){
	editor.getSession().setUseWrapMode(true);
	editor.getSession().setWrapLimitRange(40, 40);
	//renderer.setPrintMarginColumn(80);
})
addAction("Word Wrap: 80", function(){
	editor.getSession().setUseWrapMode(true);
	editor.getSession().setWrapLimitRange(80, 80);
	//renderer.setPrintMarginColumn(80);
})
addAction("Word Wrap: 100", function(){
	editor.getSession().setUseWrapMode(true);
	editor.getSession().setWrapLimitRange(100, 100);
	//renderer.setPrintMarginColumn(80);
})
addAction("Word Wrap: 120", function(){
	editor.getSession().setUseWrapMode(true);
	editor.getSession().setWrapLimitRange(120, 120);
	//renderer.setPrintMarginColumn(80);
})
addAction("Word Wrap: free", function(){
	editor.getSession().setUseWrapMode(true);
	editor.getSession().setWrapLimitRange(null, null);
	//renderer.setPrintMarginColumn(80);
})

addAction("Highlight Active Line: Off", function(){
	editor.setHighlightActiveLine(false)
})
addAction("Highlight Active Line: On", function(){
	editor.setHighlightActiveLine(true)
})


addAction("Show Print Margin: Off", function(){
	editor.setShowPrintMargin(false)
})

addAction("Show Print Margin: On", function(){
	editor.setShowPrintMargin(true)
})

addAction("Show Tab Bar: Off", function(){
	document.body.toggleClass('tabs', false)
	editor.renderer.onResize(true)
})

addAction("Show Tab Bar: On", function(){
	document.body.toggleClass('tabs', true)
	editor.renderer.onResize(true)
})

addAction("Show Invisibles: Off", function(){
	editor.renderer.setShowInvisibles(false)
})

addAction("Show Invisibles: On", function(){
	editor.renderer.setShowInvisibles(true)
})




for(var name in editor.commands.commands){
	(function(command){
		addAction("Ace Command: "+command.name, function(){
			editor.commands.exec(command.name, editor)
		})
	})(editor.commands.commands[name])
}

function storeDefault(name, value){
	var place = name[0];
	name = name.substr(1);
	if(!value){
		if(place == 's'){
			var session = editor.getSession();
			value = session['get'+name]();		
		}else if(place == 'e'){
			value = editor['get'+name]();		
		}else{
			console.log("UNKNOWN DEFAULT TYPE", place)
			return;
		}
	}
	localStorage.setItem("SessionDefault"+name, JSON.stringify(value));
}



function loadDefault(name, session){
	var place = name[0];
	name = name.substr(1);
	var setting = localStorage.getItem("SessionDefault"+name);
	var scope;
	if(session){
		if(place == 's'){
			scope = session;
		}else{
			return;
		}
	}else{
		if(place == 's'){
			scope = editor.getSession();
		}else if(place == 'e'){
			scope = editor;
		}else{
			console.log("CAN NOT LOAD FROM UNKNOWN DEFAULT TYPE", place)
			return;
		}
	}
	
	if(setting){
		var json;
		try{
			json = JSON.parse(setting);
		}catch(e){
			console.log("error parsing json", name)
		}
		if(typeof json == "object"){
			if(name == "WrapLimitRange"){
				
				scope['set'+name](json.min, json.max)
			}else{
				console.log("Unknown object form", name)
			}
			
		}else if(typeof json == "boolean" || typeof json == "number" || typeof json == "string"){
			scope['set'+name](json)
		}else if(typeof json != "undefined"){
			console.log("No handler for type", typeof json, "for", name, json)
		}
	}else{
		console.log("no setting found for ", name)
	}
	
}

function saveDefaults(){
	var defaults = [
		'sWrapLimitRange',
		'sUseWrapMode',
		'eShowPrintMargin',
		//'eFontSize',
		'eTheme',
		'eShowInvisibles',
		'sUseSoftTabs',
		'sTabSize',
		'eHighlightActiveLine'
	];
	for(var i = 0; i < defaults.length; i++){
		storeDefault(defaults[i])
	}

	storeDefault('eFontSize', window.getComputedStyle(editor.container).getPropertyValue("font-size"))
}

function loadDefaults(session){
	var defaults = [
		'sWrapLimitRange',
		'sUseWrapMode',
		'eShowPrintMargin',
		'eFontSize',
		'eTheme',
		'eShowInvisibles',
		'sUseSoftTabs',
		'sTabSize',
		'eHighlightActiveLine'
	];
	for(var i = 0; i < defaults.length; i++){
		loadDefault(defaults[i], session)
	}
	updateTheme();

}


function updateTheme(){
	function checkLoaded(){
		var currentTheme = require(editor.getTheme())
		if(currentTheme){
			var isDark = currentTheme.isDark;
			document.body.toggleClass('dark', isDark)		
		}else setTimeout(checkLoaded, 1000 / 60);
	}
	checkLoaded();
}



addAction("Save Session Defaults", function(){
	saveDefaults();
})

addAction("Restore Session Defaults", function(){
	loadDefaults();
})

addAction("Authorize Dropbox", function(){
	db.authorize(function(){
		console.log("authorized")
	})
})


addAction("Download Zip of Current Directory", function(){
	var writer = new zip.BlobWriter();
	function onerror(message) {
		alert(message);
	}
	zip.createWriter(writer, function(zipWriter) {
		zipWriter.add(file.name, new zip.BlobReader(file), function() {
			addIndex++;
			if (addIndex < files.length)
				nextFile();
			else
				onend();
		}, onprogress);
	}, onerror);
})

addAction("Preview Current File", function(){
	getFile(currentFile, function(e){
			chrome.tabs.create({url: e.toURL()})
	})
})

addAction("Browse Local Filesystem", function(){
	chrome.tabs.create({url: fs.root.toURL()})
})

addAction("Check Out of Sync", function(){
	var unsynced = checkUnsynced();
	alert(unsynced.join('\n') || 'Everything is up to date.')
	if(unsynced.length > 0){
		if(confirm("Do you want to sync them now?")){
			unsynced.forEach(function(path){
				uploadDropbox(path);
			})
		}
	}
})


var fileSessions = {};
var tabSessions = {};

var currentZIndex = 9000;

function createTab(path){
	var tab = document.createElement('li');
	var obj = {
		el: tab,
		click: function(event){
			if(event && event.button == 1){
				console.log("close session")
				closeSession(path);
			}else{
				console.log("open blah")
				openFile(path);	
			}
		},
		updatePath: function(text){
			tabSessions[text] = tabSessions[path];
			fileSessions[text] = fileSessions[path];
			delete tabSessions[path];
			delete fileSessions[path];
			path = text;
			obj.render();

		},
		render: function(){

			link.innerText = path.split('/').slice(-1).join('');
		}
	}
	tab.style.zIndex = currentZIndex--;
	var link = document.createElement('a');
	link.onclick = obj.click;
	var left = document.createElement('div')
	left.className = 'left-mask'
	left.appendChild(document.createElement('span'))
	var right = document.createElement('div')
	right.className = 'right-mask'
	right.appendChild(document.createElement('span'))
	tab.appendChild(link)
	tab.appendChild(left)
	tab.appendChild(right)
	document.getElementById('tabbar').appendChild(tab)
	obj.render();

	return obj;
}

function openFile(path){
	currentFile = path;

	getEditSession(path, function(session, tab){
		editor.setSession(session);
		localStorage.lastOpenedFile = path;
		var sel = document.querySelectorAll('#tabbar .current');
		for (var i = sel.length - 1; i >= 0; i--) {
			sel[i].toggleClass('current', false);
		};
		tab.el.toggleClass('current', true)

		db.getMetadata(path, function(meta){
			if(meta.rev != getLatestRevision(path)){
				console.log("server has different revision")
				//if the current file and the server one is identical, then well, yeah, no need to sync
				if(!getLatestRevision(path) || meta.rev == getLatestRevision(path).replace(/\*/g, '')){
					console.log("local revision is newer")
					//the local one is more recent than the server one, go sync it
					uploadDropbox(path);
				}else{
					if(getLatestRevision(path).indexOf('*') == -1){
						console.log("local revision is out of date, updating")
						//the local version has never been modified, feel free to download and update
						syncFile(path, function(){
							console.log("reopening path")
							openFile(path) //please dont kill me untested recursion gods
						})
					}else{
						//oh god this is not good. 
						//the local version has edits and so does the server. Go and run aruond scraming.
						alert("local cache and server copy are out of date. commencing panic mode.")
					}
				}
			}	
		})
	})
	console.log(currentFile)
}

function getEditSession(path, callback){
	if(path in fileSessions){
		var session = fileSessions[path];
		var text = session.getValue();
		if(session.latestSync != getLatestRevision(path)){
			readContents(path, function(data){
				if(data != text){
	                //TODO: it doesn't know the difference between unsaved changes and changes from other applications, also it needs to be able to load new versions from dropbox if available and appropriate
	                if(session.latestValue != text){
	                	console.error('merge conflict! data will have been lost', session.latestValue, text)
	                }
	                console.log("local data changed!")
					session.setValue(data)
					session.latestSync = getLatestRevision(path)
					session.latestValue = data;	
					
				}

			})	
		}

		
		callback(session, tabSessions[path]);
	}else{
		readContents(path, function(data){
			if(data.indexOf(String.fromCharCode(65533)) > -1){ //not sure how reliable this is
				if(!confirm("Are you sure you want to open "+path+"?\nIt may be a binary file.")) return;
			}
			var newSession = new EditSession(data, getModeFromPath(path).mode);
			newSession.setUndoManager(new UndoManager());
			
			newSession.latestSync = getLatestRevision(path);
			newSession.latestValue = data;

			loadDefaults(newSession)
			fileSessions[path] = newSession;
			var newTab = createTab(path);
			tabSessions[path] = newTab;
			callback(newSession, newTab)
		})	
	}
}

event.addListener(document.getElementById("text"), "keydown", function(e){

	var sel = document.querySelector('#list .item.selected');
	
	if(e.keyIdentifier == "Down"){
		e.preventDefault();
		if(sel && sel.nextSibling){
			sel.className = 'item';
			sel.nextSibling.className = 'item selected'
			sel.nextSibling.scrollIntoView(false)
		}
	}else if(e.keyIdentifier == "Up"){
		e.preventDefault();
		if(sel && sel.previousSibling){
			sel.className = 'item';
			sel.previousSibling.className = 'item selected';
			sel.previousSibling.scrollIntoView(false)
		}
	}else if(e.keyIdentifier == "Enter"){
		if(sel){
			if(paletteMode == "search"){
				if(e.shiftKey){
					editor.commands.exec('findprevious', editor)    
				}else{
					editor.commands.exec('findnext', editor)    
				}
				
			}else{
				if(sel.value){
					sel.value();
				}else{
					alert("Error! No handler for command!")
				}
			}	
		}
		
	}else if(e.keyCode == 27){ //Escape
		document.getElementById("command").style.display = "none";
		editor.focus();
	}

})

event.addListener(document.getElementById("list"), "click", function(e){
	document.getElementById("text").focus();
})


var paletteMode = '';

function displayPalette(mode, def){
	paletteMode = mode;
	if(paletteMode == "search"){
		document.getElementById('list').innerHTML = '';
		var options = ["Find Case Sensitive (TODO)", 
						"Find Case Insensitive (TODO)", 
						"Find Regular Expression (TODO)"];
		options.forEach(function(e, i){
			var res = document.createElement('div');
			res.className = 'item';
			res.innerHTML = e;
			if(i == 0) res.className += " selected ";
			document.getElementById('list').appendChild(res);
		})
	}else if(paletteMode == "file"){
		if(!currentDirectory || browse_mode == "local"){ //local = fast
			abstractDirectoryContents(currentPath, function(e){
				currentDirectory = e;
				renderQuery(document.getElementById("text").value);
			})  
		}
		
	}
	document.getElementById("text").value = def || '';
	renderQuery(document.getElementById("text").value)
	document.getElementById("command").style.display = ""
	document.getElementById("text").focus()
}



RegExp.escape = function(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

var browse_mode = 'local';


addAction("Browse Mode: Local Copy", function(args){
	browse_mode = 'local'
	currentDirectory = null
})

addAction("Browse Mode: Remote Dropbox", function(args){
	browse_mode = 'dropbox'
	currentDirectory = null	
})


addAction("Download Current Directory", function(args){
	if(confirm("This will overwrite locally "+currentPath+"\nAre you sure?")){
		syncDirectory(currentPath)
	}
})

addAction("Reset last opened file", function(args){
	delete localStorage.lastOpenedFile
})


addAction("Clear Local Storage Cache", function(){
	if(confirm("This will remove everything that is stored locally. Make sure everything is synced first.")){
		delete localStorage.lastOpenedFile
		resetStorage()
	}
})

function renderQuery(query){
	if(paletteMode == 'search'){
		if(query){
			if(/^:/.test(query)){
				var lnum = parseInt(query.substr(1),10);
				if(lnum > 0) editor.gotoLine(lnum);
			}else{
				editor.commands.exec('find', editor, query)  
			}
			
		}
		
		return;
	}else if(paletteMode == "command"){
		var parts = query.split("/");
		query = parts[0];
	document.getElementById('list').innerHTML = '';
	var regex = new RegExp(query.split("").map(function(e){
		return RegExp.escape(e)
	}).join(".*?"), "i")
	var results = actions.filter(function(e){
		return regex.test(e[0])
	});
	results.forEach(function(result, i){
		var e = result[0];
		var res = document.createElement('div');
		res.className = 'item'
		if(i == 0) res.className += " selected ";
		var k = query.split(''), z = k.shift(), b = '';
		for(var j = 0; j < e.length; j++){
			if(e[j] && z && e[j].toLowerCase() == z.toLowerCase()){
				z = k.shift();
				b += '<b>'+e[j]+'</b>'
			}else{
				b += e[j]
			}
		}
		if(b.split(":").length == 2){
			b = "<span class=path>"+b.split(":")[0]+"</span>:"+b.split(":")[1];
		}
		res.innerHTML = b;
		res.value = function(){
				result[1](parts.slice(1))
		};
		document.getElementById('list').appendChild(res);
	})
	}else{
		document.getElementById('list').innerHTML = '';
		
		if(!currentDirectory){
			document.getElementById('list').innerHTML = '<div>Loading...</div>';
			return;
		}
        
        var deletemode = false;
        if(query[0] == '-'){
            deletemode = true;
            query = query.substr(1);
        }
		
		var regex = new RegExp(query.split("").map(function(e){
			return RegExp.escape(e)
		}).join(".*?"), "i")

		var results = currentDirectory.contents.map(function(e){
			if(e.is_dir){
				return [e, function(){
					currentPath = e.path;
					currentDirectory = null;
					displayPalette('file');
				}]
			}else{
				return [e, function(){
					abstractOpenFile(e.path)
				}]
			}
			
		}).filter(function(e){
			var file = e[0];
			var pathcomp = file.path.split('/');
			var e = pathcomp[pathcomp.length - 1];
			return regex.test(e)
		});
		if((currentPath != '/' && currentPath != '') && "../".substr(0, query.length) == query){
			results.push([{
				path: "../",
				is_dir: "true"
			}, function(){
				//ascend!
				currentPath = currentPath.replace(/\/$/, '');
				currentPath = currentPath.replace(/[^\/]*$/,'');
				currentDirectory = null;
				displayPalette('file');
			}])  
		}

		if(results.length == 0 && !/\/$/.test(query)){
			var fn = (currentPath + '/' + query.replace(/^\+/, '')).replace(/\/+/g, '/');
			results.push([{
				path: "+create "+fn,
				is_dir: false,
				size: '0 bytes'
			}, function(){
				if(confirm("Do you want to create " + fn+ "?")){
					openFile(fn);	
				}
			}])
		}else{
    	    if(deletemode){
                results = results.filter(function(e){
                	
                	return e[0].path != '../'// && e[0].is_dir == false
                }).map(function(k){
                    var e = [];
                    e[0] = JSON.parse(JSON.stringify(k[0]));
                    var fn = e[0].path;
                    e[0].path = '-delete '+fn;
                    e[1] = function(){
                        if(confirm("Do you want to delete "+fn+"?")){
                            abstractDeletePath(fn, e[0].is_dir)
                            closeSession(fn); //TODO: recursively search if it's a direcotry
                            setTimeout(function(){
                            	displayPalette('file');
                            }, 762)
                        }
                    }
                    return e;
                })   
    	    }   
		}
		

		results.forEach(function(result, i){
			var file = result[0];
			var pathcomp = file.path.split('/');
			var e = pathcomp[pathcomp.length - 1];

			var res = document.createElement('div');
			res.className = 'item'
			if(i == 0) res.className += " selected ";

			var k = query.split(''), z = k.shift(), b = '';
			for(var j = 0; j < e.length; j++){
				if(e[j] && z && e[j].toLowerCase() == z.toLowerCase()){
					z = k.shift();
					b += '<b>'+e[j]+'</b>'
				}else{
					b += e[j]
				}
			}
			if(file.path == "../"){
				res.innerHTML = '../' + "<span class=size>folder</span>";
			}else{
				if(file.is_dir){
					//pathcomp.push('')
					b = '<span class=path>' + b + '/</span>'
					b += " <span class=size>folder</span>";
				}else{
					b += "<span class=size>"+file.size+"</span>"
				}  
				res.innerHTML = '<span class=path>' +pathcomp.slice(0, -1).join('/') + '/</span>' + b;
			}
			

			res.value = result[1];
			document.getElementById('list').appendChild(res);
		})
	}


}

event.addListener(document.getElementById("text"), "input", function(e){
	var query = document.getElementById("text").value;
	renderQuery(query)
})
