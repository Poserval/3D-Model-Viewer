package com.yourcompany.modelviewer;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class DownloadHelper {
    
    public static void saveFile(Context context, byte[] data, String fileName) {
        String mimeType = getMimeType(fileName);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ - через MediaStore
            saveViaMediaStore(context, data, fileName, mimeType);
        } else {
            // Android 9 и ниже - создаем папку в корне
            saveLegacy(context, data, fileName);
        }
    }
    
    private static void saveViaMediaStore(Context context, byte[] data, String fileName, String mimeType) {
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/3DViewer/");
            
            Uri uri = context.getContentResolver().insert(MediaStore.Files.getContentUri("external"), values);
            OutputStream os = context.getContentResolver().openOutputStream(uri);
            os.write(data);
            os.close();
            
            Toast.makeText(context, 
                "✅ Файл сохранен: Downloads/3DViewer/" + fileName, 
                Toast.LENGTH_LONG).show();
                
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, 
                "❌ Ошибка сохранения: " + e.getMessage(), 
                Toast.LENGTH_LONG).show();
        }
    }
    
    private static void saveLegacy(Context context, byte[] data, String fileName) {
        try {
            // Создаем папку /storage/emulated/0/3DViewer/
            File folder = new File(Environment.getExternalStorageDirectory(), "3DViewer");
            if (!folder.exists()) {
                folder.mkdirs();
            }
            
            File file = new File(folder, fileName);
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(data);
            fos.close();
            
            Toast.makeText(context, 
                "✅ Файл сохранен: /3DViewer/" + fileName, 
                Toast.LENGTH_LONG).show();
                
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(context, 
                "❌ Ошибка сохранения: " + e.getMessage(), 
                Toast.LENGTH_LONG).show();
        }
    }
    
    private static String getMimeType(String fileName) {
        String ext = fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
        switch (ext) {
            case "stl": return "application/sla";
            case "obj": return "application/octet-stream";
            case "glb": return "model/gltf-binary";
            case "gltf": return "model/gltf+json";
            default: return "application/octet-stream";
        }
    }
}
