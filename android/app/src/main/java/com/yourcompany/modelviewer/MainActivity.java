package ru.dviewer.app;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.util.Base64;
import android.util.Log;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // ВКЛЮЧАЕМ ОТЛАДКУ ДО ВСЕГО (ДАЖЕ ДО НАХОЖДЕНИЯ WebView)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
            Log.d("3DViewer", "ОТЛАДКА ВКЛЮЧЕНА!");
        }

        webView = findViewById(R.id.webview);
        
        // Включим еще раз для надежности
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
            Log.d("3DViewer", "ОТЛАДКА ПОДТВЕРЖДЕНА!");
        }
        
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setWebGLEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAppCacheEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        
        webView.addJavascriptInterface(new WebAppInterface(), "Android");
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/www/index.html");
        
        Log.d("3DViewer", "WebView создан и загружен");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
    
    public class WebAppInterface {
        @JavascriptInterface
        public void saveFile(String base64Data, String fileName) {
            try {
                Log.d("3DViewer", "saveFile вызван: " + fileName);
                byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                Log.d("3DViewer", "Данные декодированы: " + data.length + " байт");
                // DownloadHelper.saveFile(MainActivity.this, data, fileName);
            } catch (Exception e) {
                Log.e("3DViewer", "Ошибка в saveFile", e);
            }
        }
    }
}
