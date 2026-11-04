package site.codoc.mobile;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.nfc.NfcAdapter;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.*;
import android.widget.*;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.fragment.app.FragmentActivity;
import androidx.webkit.*;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Set;
import org.json.JSONObject;

/** Native device capabilities stay behind an exact HTTPS origin and main-frame check. */
public final class MainActivity extends FragmentActivity {
    private static final String ORIGIN = "https://codoc.site";
    private static final int FILE_PICKER = 100;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        web = new WebView(this);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout actions = new LinearLayout(this);
        Button back = new Button(this); back.setText("‹"); back.setContentDescription("Back");
        back.setOnClickListener(view -> { if (web.canGoBack()) web.goBack(); });
        Button refresh = new Button(this); refresh.setText("↻"); refresh.setContentDescription("Reload"); refresh.setOnClickListener(view -> web.reload());
        actions.addView(back); actions.addView(refresh); root.addView(actions); setContentView(root);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.getSettings().setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "codoc.site".equals(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443)) return false;
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "mailto".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) { handler.cancel(); }
            @Override public void onPageFinished(WebView view, String url) { installDownloadBridge(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_PICKER); return true; }
                catch (Exception error) { fileCallback.onReceiveValue(null); fileCallback = null; return false; }
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "CoDocNative", Set.of(ORIGIN), (view, message, sourceOrigin, isMainFrame, reply) -> {
                if (!isMainFrame || !ORIGIN.equals(sourceOrigin.toString())) return;
                try {
                    JSONObject request = new JSONObject(message.getData());
                    String type = request.optString("type");
                    if ("capabilities".equals(type)) {
                        NfcAdapter nfc = NfcAdapter.getDefaultAdapter(this);
                        JSONObject result = new JSONObject().put("biometrics", BiometricManager.from(this).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS)
                                .put("nfc", nfc != null && nfc.isEnabled()).put("qualifiedSigningProvider", false);
                        respond(reply, request, result);
                    } else if ("biometric".equals(type)) {
                        BiometricPrompt prompt = new BiometricPrompt(this, ContextCompat.getMainExecutor(this), new BiometricPrompt.AuthenticationCallback() {
                            @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) { respond(reply, request, json("authenticated", true)); }
                            @Override public void onAuthenticationError(int code, CharSequence text) { respond(reply, request, json("error", text.toString())); }
                        });
                        prompt.authenticate(new BiometricPrompt.PromptInfo.Builder().setTitle("CoDoc")
                                .setSubtitle(request.optString("reason", "Confirm this action"))
                                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG).setNegativeButtonText(getString(android.R.string.cancel)).build());
                    } else if ("saveFile".equals(type)) {
                        saveFile(request);
                        respond(reply, request, json("shared", true));
                    } else respond(reply, request, json("error", "Unsupported native action"));
                } catch (Exception error) { reply.postMessage("{\"error\":\"Invalid native request\"}"); }
            });
        }
        web.loadUrl(ORIGIN + "/app?native=android");
    }
    private JSONObject json(String key, Object value) { try { return new JSONObject().put(key, value).put("signatureCreated", false); } catch (Exception error) { return new JSONObject(); } }
    private void respond(JavaScriptReplyProxy reply, JSONObject request, JSONObject result) { try { reply.postMessage(new JSONObject().put("id", request.optString("id")).put("result", result).toString()); } catch (Exception ignored) { } }
    private void saveFile(JSONObject request) throws Exception {
        String encoded = request.getString("base64");
        if (encoded.length() > 28 * 1024 * 1024) throw new IllegalArgumentException("File exceeds 20 MB");
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        File exports = new File(getCacheDir(), "exports"); if (!exports.exists() && !exports.mkdirs()) throw new IllegalStateException("Cannot create export folder");
        File file = new File(exports, System.currentTimeMillis() + "-" + request.optString("filename", "document.pdf").replaceAll("[^\\p{L}\\p{N}._-]", "_"));
        try (FileOutputStream stream = new FileOutputStream(file)) { stream.write(bytes); }
        Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
        Intent send = new Intent(Intent.ACTION_SEND).setType(request.optString("mime", "application/octet-stream"));
        send.putExtra(Intent.EXTRA_STREAM, uri); send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(send, "CoDoc"));
    }
    private void installDownloadBridge() {
        if (web.getUrl() == null || !web.getUrl().startsWith(ORIGIN + "/")) return;
        web.evaluateJavascript("if(window.CoDocNative&&!window.__codocNativeDownloads){window.__codocNativeDownloads=true;document.addEventListener('click',async function(e){const a=e.target.closest&&e.target.closest('a[download]');if(!a||!a.href.startsWith('blob:'))return;e.preventDefault();try{const b=await(await fetch(a.href)).blob();if(b.size>20*1024*1024)throw Error('File exceeds 20 MB');const r=new FileReader();r.onload=()=>CoDocNative.postMessage(JSON.stringify({type:'saveFile',id:crypto.randomUUID(),filename:a.download,mime:b.type,base64:r.result.split(',')[1]}));r.readAsDataURL(b);}catch(err){alert(err.message)}},true)}", null);
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_PICKER && fileCallback != null) { fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data)); fileCallback = null; }
    }
    @Override protected void onDestroy() { if (fileCallback != null) fileCallback.onReceiveValue(null); web.destroy(); super.onDestroy(); }
}
