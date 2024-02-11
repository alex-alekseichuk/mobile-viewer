package com.phonegap.plugins.share;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Intent;

import org.apache.cordova.api.Plugin;
import org.apache.cordova.api.PluginResult;

@SuppressWarnings("deprecation")
public class Share extends Plugin {

    @Override
    public PluginResult execute(String action, JSONArray args, String callbackId) {
        try {
            JSONObject jo = args.getJSONObject(0);
            doSendIntent(jo.getString("url"), jo.getString("subject"), jo.getString("text")); 
            return new PluginResult(PluginResult.Status.OK);
        } catch (JSONException e) {
            return new PluginResult(PluginResult.Status.JSON_EXCEPTION);
        }
    }
    
    private void doSendIntent(String url, String subject, String html) {
        Intent sharingIntent = new Intent(Intent.ACTION_SEND);
        sharingIntent.setType("text/plain");
        sharingIntent.putExtra(Intent.EXTRA_SUBJECT, subject);
        
        StringBuilder content = new StringBuilder(url + "\n" + subject);
        if (null != html && html.length() > 0)
        	content.append("\n\n" + html2Plain(html));
        sharingIntent.putExtra(android.content.Intent.EXTRA_TEXT, content.toString());
        
        this.cordova.startActivityForResult(this, Intent.createChooser(sharingIntent, subject), 0);
    }

    private static String[] oneNewLineTags = {"div","td"};
    private static String[] twoNewLineTags = {"blockquote","li","h1","h2","h3","h4","h5","h6","ol","p","table","tr","ul","hr"};
    private static int newLinesForTag(String tag, int was) {
		if ("br".equals(tag))
			return was + 1;
    	for (int i=0, n=twoNewLineTags.length; i<n; ++i)
    		if (twoNewLineTags[i].equals(tag))
    			return was >= 2 ? was : 2;
    	for (int i=0, n=oneNewLineTags.length; i<n; ++i)
    		if (oneNewLineTags[i].equals(tag))
    			return was >= 1 ? was : 1;
    	return was;
    }
    private static String html2Plain(String html) {
    	StringBuilder sbResult = null;
    	InputStream is = new ByteArrayInputStream(html.getBytes());
    	BufferedReader br = new BufferedReader(new InputStreamReader(is));
    	int c;
    	try {
    		boolean isTag = false;
    		int afterTag = 0;
    		StringBuilder sbTagName = null;
    		char prevChar = ' ';
			while (-1 != (c = br.read())) {
				char ch = (char)c;
				if (isTag) {
					if (ch == '>') {
						prevChar = ' ';
						isTag = false;
						if (null != sbTagName) {
							afterTag = newLinesForTag(sbTagName.toString(), afterTag);
						}
					} else {
						if (null != sbTagName && (ch == ' ' || ch == '\n' || ch == '\r' || ch == '\t')) {
							afterTag = newLinesForTag(sbTagName.toString(), afterTag);
							sbTagName = null;
						}							
						if (null != sbTagName && ch != '/')
							sbTagName.append(ch);
					}
				} else {
					if (ch == '<') {
						isTag = true;
						sbTagName = new StringBuilder();
					} else {
						if (Character.isWhitespace(ch)) {
							ch =  ' ';
							if (prevChar == ' ')
								continue;
						}
						if (afterTag > 0) {
							if (null != sbResult)
								for (int i = 0; i < afterTag; ++i)
									sbResult.append('\n');
							afterTag = 0;
						}
						if (null == sbResult)
							sbResult = new StringBuilder();
						sbResult.append(ch);
						prevChar = ch;
					}					
				}
				
			}
		} catch (IOException e) {
			return "";
		}
    	return sbResult.toString();
    }
    
}

