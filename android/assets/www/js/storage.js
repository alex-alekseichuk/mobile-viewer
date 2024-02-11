var Storage = {
    VERSION_URL: 'http://www.advocaten.nl/update/version.txt',
    STRUCT_URL: 'http://www.advocaten.nl/update/structure.json',
    ZIP_URL: 'http://www.advocaten.nl/update/structure.zip',
    FEEDBACK_URL: 'http://www.advocaten.nl/update/feedback.php',

//    VERSION_URL: 'http://192.168.0.24/update/version.txt',
//    STRUCT_URL: 'http://192.168.0.24/update/structure.json',
//    ZIP_URL: 'http://192.168.0.24/update/structure.zip',

    CHECK_TIMEOUT: 1000 * 60 * 20, // 20 min.
    PATH: 'Android/data/com.kikudjiro.advocaten/files/',

    unpackNewVersion: function(params, callback) {
        $('#alert').html('installeren...');
        //alert('unpack1');
        cordova.exec(function(status) {
            //alert('unpack2');
            Util.readLocalFile('structure.json', function(text) {
                //alert('unpack3');
                var json;
                try {json = JSON.parse(text)}
                catch (e) {callback();return;}
                //alert('ok');
                callback(json);
            }, function() {callback(); });
        }, function(err) {
            if (-1 != err.indexOf('ENOSPC'))
                alert('Ontoereikend geheugen. Maak ruimte vrij.');
            else
                alert("Kan nieuwe versie niet installeren.");
            callback();
        }, "ZipPlugin", "extract", params);
    },
    downloadNewVersion: function(callback) {
        $('#alert').html('downloaden...');
        //alert('download?');
        cordova.exec(function(status) {
            if (!status.status)
                return;
            //alert('unpack?');
            Storage.unpackNewVersion(['structure.zip', ""], callback);
        }, function(err) {
            if (-1 != err.indexOf('ENOSPC'))
                alert('Ontoereikend geheugen. Maak ruimte vrij.');
            else
                alert("Kan nieuwe gegevens niet ophalen.");
            callback();
        }, "Downloader", "downloadFile", [Storage.ZIP_URL, {overwrite: true}]);

//        Downloader.downloadFile(Storage.ZIP_URL, {overwrite: true}, function(res) {
//            //alert(JSON.stringify(result));
//            var ZipClient = new ExtractZipFilePlugin();
//            ZipClient.extractFile('sdcard/' + 'structure.zip',function(){
//                Util.readLocalFile('structure.json', function(text) {
//                    try {
//                        alert('ok');
//                        callback(text);
//                    } catch (e) {
//                        alert('err: ' + e);
//                        callback();
//                    }
//                }, function() { alert('err: 2');callback(); });
//            },function(error){alert('err1: ' + error);callback();},'ExtractZipFilePlugin');
//        }, function(error) {alert('err2: ' + error);callback();});

//        zip.createReader(new zip.HttpReader(Storage.ZIP_URL), function(zipReader) {
//            alert('createReader');
//            zipReader.getEntries(function(entries) {
//                var n = entries.length;
//                alert('getEntries: ' + n);
//                entries.forEach(function(entry) {
//                    alert('entry: ' + entry.filename);
//                    Util.openWriteFile(entry.filename, function(zipFileEntry) {
//
//                        alert('opened: ' + entry.filename);
//                        var writer = new zip.FileWriter(zipFileEntry);
//                        entry.getData(writer, function(blob) {
//                            alert('saved: ' + entry.filename);
//                            //var blobURL = zipFileEntry.toURL();
//                            --n;
//                            if (n <= 0)
//                            {
//                                alert('last');
//                                Util.readLocalFile('structure.json', function(text) {
//                                    try {
//                                        alert('ok');
//                                        callback(text);
//                                    } catch (e) {
//                                        alert('err: ' + e);
//                                        callback();
//                                    }
//                                }, function() { alert('err: 2');callback(); });
//                            }
//                        }, function() {});
//                    },function(){alert('err: 3');callback();});
//                });
//            }, function(e){alert('create error: ' + e);callback();});
//        }, function() {alert('err: 4');callback();});

//        Util.loadJson(url, function(newStructure){
//            Util.writeLocalFile('structure.json', JSON.stringify(newStructure), function(){
//                callback(newStructure);
//            }, function() { callback(); });
//        }, function() { callback(); });
    },
    checkNewVersion: function(callback) {
        if (Connection.NONE == navigator.network.connection.type)
            callback();
        if (Storage._checked && (new Date().getTime()) - Storage._checked < Storage.CHECK_TIMEOUT)
            callback();
        Storage._checked = new Date().getTime();
        Util.loadText(Storage.VERSION_URL, function(latestVersion){
            if (latestVersion == Storage._version) {
                callback();
            } else {
                Storage.downloadNewVersion(function(newStructure){
                    if (!newStructure)
                        callback();
                    else
                        Util.writeLocalFile('version.txt', latestVersion, function(){
                            Storage._version = latestVersion;
                            callback(newStructure);
                        }, function() {callback();});
                });
            }
        }, function() { callback(); });
    },
    loadInitStructure: function(callback) {
        Util.loadJson('initial/structure.json', function(newStructure){
            Util.writeLocalFile('structure.json', JSON.stringify(newStructure), function(){
                callback(newStructure);
            }, function() { callback(); });
        }, function() { callback(); });
    },
    readCurrentVersion: function(callback) {
        // read the version from local storage
        Util.readLocalFile('version.txt', function(text){
            Storage._version = text;
            // read the structure from local storage
            Util.readLocalFile('structure.json', function(text) {
                try {
                    callback(JSON.parse(text));
                } catch (e) {
                    callback();
                }
            }, function() { callback(); });
        }, function(){
            // if we can't load version file from local storage
            // then there is first time we start the application
            // so, we load the content from initial
            // and write to local storage
            Util.loadText('initial/version.txt', function(text){
                Storage.unpackNewVersion(['www/initial/structure.zip', 'asset'], function(json){
                    Storage._version = text;
                    Util.writeLocalFile('version.txt', text, function(){
                            callback(json);
                    }, function() {callback(); });
                });
            }, function() {callback(); });
        });
    }
};
