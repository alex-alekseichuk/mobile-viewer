/*
 	Author: Vishal Rajpal
 	Filename: ExtractZipFilePlugin.java
 	Created Date: 21-02-2012
 	Modified Date: 04-04-2012
*/

package com.phonegap.plugins.ExtractZipFile;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

import org.json.JSONArray;
import org.json.JSONException;

//import com.phonegap.api.Plugin;
//import com.phonegap.api.PluginResult;
import org.apache.cordova.api.Plugin;
import org.apache.cordova.api.PluginResult;

import android.os.Environment;

@SuppressWarnings("deprecation")
public class ExtractZipFilePlugin extends Plugin {

	private String baseDir;
	private String dirToInsert;
	
	@Override
	public PluginResult execute(String arg0, JSONArray args, String arg2) {
		PluginResult.Status status = PluginResult.Status.OK;
        try {
			String filename = args.getString(0);
			String type = args.getString(1);
			
			baseDir = Environment.getExternalStorageDirectory().getAbsolutePath() +
					"/Android/data/com.kikudjiro.advocaten/files";
			
			dirToInsert = "";
			
			BufferedInputStream is = null;
			ZipEntry entry;
			ZipFile zipfile;
			try {
				if (type.equals("asset")) {
					dirToInsert = baseDir + File.separator;
					
					ZipInputStream zis = new ZipInputStream(cordova.getActivity().getAssets().open(filename));
					while (null != (entry = zis.getNextEntry())) {
						  is = new BufferedInputStream(zis);
						  
						  _processZipEntry(entry, is);
						  
						  zis.closeEntry();
					}
					zis.close();
		        } else {
		        	dirToInsert = baseDir + File.separator;
//					String[] dirToSplit = filename.split(File.separator);
//					for(int i = 0; i < dirToSplit.length-1; i++)
//					{
//						dirToInsert += dirToSplit[i] + File.separator;
//					}

					File file = new File(baseDir + File.separator + filename);
					zipfile = new ZipFile(file);
					Enumeration<? extends ZipEntry> e = zipfile.entries();
					while (e.hasMoreElements()) {
						entry = (ZipEntry) e.nextElement();
						is = new BufferedInputStream(zipfile.getInputStream(entry));
						  
						_processZipEntry(entry, is);
						  
						if (!entry.isDirectory())
							is.close();
					}
					file.delete();
		        }
			} catch (ZipException e1) {
				// TODO Auto-generated catch block
				return new PluginResult(PluginResult.Status.MALFORMED_URL_EXCEPTION);
			} catch (IOException e1) {
				// TODO Auto-generated catch block
				return new PluginResult(PluginResult.Status.IO_EXCEPTION);
			}
		} catch (JSONException e) {
			// TODO Auto-generated catch block
			return new PluginResult(PluginResult.Status.JSON_EXCEPTION);
		}
        return new PluginResult(status);
	}
	private void _processZipEntry(ZipEntry entry, BufferedInputStream is) throws ZipException, IOException {
		BufferedOutputStream dest = null;
		int count;
		byte data[] = new byte[102222];
		String fileName = dirToInsert + entry.getName();
		//String fileName = entry.getName();
		File outFile = new File(fileName);
		if (entry.isDirectory()){
			outFile.mkdirs();
		} else {
			FileOutputStream fos = new FileOutputStream(outFile);
			dest = new BufferedOutputStream(fos, 102222);
			while ((count = is.read(data, 0, 102222)) != -1){
				dest.write(data, 0, count);
			}
			dest.flush();
			dest.close();
		}
	}
}
