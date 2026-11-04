import SwiftUI
import WebKit
import LocalAuthentication
import CoreNFC

struct WebEditor: UIViewRepresentable {
    let onExport: (URL) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onExport: onExport) }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "CoDocNative")
        configuration.userContentController.addUserScript(WKUserScript(source: Self.downloadScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        if #available(iOS 16.4, *) { view.isInspectable = false }
        view.load(URLRequest(url: URL(string: "https://codoc.site/app?native=ios")!))
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "CoDocNative", contentWorld: .page)
        view.navigationDelegate = nil
        view.uiDelegate = nil
        view.stopLoading()
    }
    private static let downloadScript = """
    if(location.origin==='https://codoc.site'&&!window.__codocNativeDownloads){window.__codocNativeDownloads=true;
    document.addEventListener('click',async function(e){const a=e.target.closest&&e.target.closest('a[download]');if(!a||!a.href.startsWith('blob:'))return;
    e.preventDefault();try{const b=await(await fetch(a.href)).blob();if(b.size>20*1024*1024)throw Error('File exceeds 20 MB');const r=new FileReader();r.onload=()=>window.webkit.messageHandlers.CoDocNative.postMessage({type:'saveFile',filename:a.download,mime:b.type,base64:r.result.split(',')[1]});r.readAsDataURL(b);}catch(err){alert(err.message)}},true);}
    """
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply, WKDownloadDelegate {
        let onExport: (URL) -> Void
        var downloads: [ObjectIdentifier: URL] = [:]
        init(onExport: @escaping (URL) -> Void) { self.onExport = onExport }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
            let origin = message.frameInfo.securityOrigin
            guard message.frameInfo.isMainFrame, origin.protocol == "https", origin.host == "codoc.site", origin.port == 0 || origin.port == 443,
                  let request = message.body as? [String: Any], let type = request["type"] as? String else { replyHandler(nil, "Untrusted origin"); return }
            switch type {
            case "capabilities":
                let context = LAContext()
                replyHandler(["biometrics": context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil), "nfc": NFCNDEFReaderSession.readingAvailable, "qualifiedSigningProvider": false], nil)
            case "biometric":
                let context = LAContext()
                context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: request["reason"] as? String ?? "Confirm this action") { success, error in
                    DispatchQueue.main.async { replyHandler(["authenticated": success, "signatureCreated": false], error?.localizedDescription) }
                }
            case "saveFile":
                guard let encoded = request["base64"] as? String, encoded.count <= 28 * 1024 * 1024, let bytes = Data(base64Encoded: encoded) else { replyHandler(nil, "Invalid file"); return }
                do {
                    let name = (request["filename"] as? String ?? "document.pdf").components(separatedBy: CharacterSet.alphanumerics.union(CharacterSet(charactersIn: ".-_ ")).inverted).joined(separator: "_")
                    let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + "-" + name)
                    try bytes.write(to: url, options: .atomic)
                    onExport(url)
                    replyHandler(["shared": true, "signatureCreated": false], nil)
                } catch { replyHandler(nil, error.localizedDescription) }
            default: replyHandler(nil, "Signing provider is not configured")
            }
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.scheme == "https", url.host == "codoc.site", url.port == nil || url.port == 443 { decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow); return }
            if navigationAction.targetFrame?.isMainFrame != false, ["https", "mailto"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) { decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download) }
        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            let filename = URL(fileURLWithPath: suggestedFilename).lastPathComponent
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + "-" + filename)
            downloads[ObjectIdentifier(download)] = url
            completionHandler(url)
        }
        func downloadDidFinish(_ download: WKDownload) { if let url = downloads.removeValue(forKey: ObjectIdentifier(download)) { onExport(url) } }
        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) { if let url = downloads.removeValue(forKey: ObjectIdentifier(download)) { try? FileManager.default.removeItem(at: url) } }
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) { completionHandler() }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let controller = webView.window?.rootViewController else { completionHandler(false); return }
            let alert = UIAlertController(title: "CoDoc", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: String(localized: "Cancel"), style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: String(localized: "Confirm"), style: .default) { _ in completionHandler(true) })
            controller.present(alert, animated: true)
        }
    }
}
