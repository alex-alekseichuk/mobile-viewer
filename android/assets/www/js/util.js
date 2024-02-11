var Util = {
    readLocalFile:function(fileName, callback, fail) {
        fileName = Storage.PATH + fileName;
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
            fileSystem.root.getFile(fileName, null, function(fileEntry) {
                fileEntry.file(function(file){
                    var reader = new FileReader();
                    reader.onloadend = function(evt) {
                        callback(evt.target.result);
                    };
                    reader.readAsText(file);
                }, fail);
            }, fail);
        }, fail);
    },
    openWriteFile:function(fileName, callback, fail) {
        fileName = Storage.PATH + fileName;
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
            fileSystem.root.getFile(fileName, {'create':true, 'exclusive':false}, function(fileEntry) {
                callback(fileEntry);
            }, function(){fail();});
        }, fail);
    },
    writeLocalFile:function(fileName, text, callback, fail) {
        Util.openWriteFile(fileName, function(fileEntry) {
            fileEntry.createWriter(function(writer){
                writer.onwriteend = callback;
                writer.write(text);
            }, fail);
        }, fail);
    },
    loadJson:function(url, callback, fail) {
        $.ajax({
            cache:false,
            url: url,
            dataType : "json",
            success: function (data) {
                callback(data);
            },
            error:function(){
                fail();
            }
        });
    },
    loadText:function(url, callback, fail) {
        $.ajax({
            cache:false,
            url: url,
            success: function (data) {
                callback(data);
            },
            error:function(){
                fail();
            }
        });
    },

    exit:function(){navigator.app.exitApp();},
    messageBox:function(message, callback, title, btn) {
        navigator.notification.alert(message, callback, title||'Warning', btn||'Ok');
    }

};
