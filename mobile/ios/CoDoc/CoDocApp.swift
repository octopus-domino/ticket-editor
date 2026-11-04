import SwiftUI

@main
struct CoDocApp: App {
    var body: some Scene { WindowGroup { BrowserScreen() } }
}

struct ExportedDocument: Identifiable { let id = UUID(); let url: URL }
struct BrowserScreen: View {
    @State private var exported: ExportedDocument?
    var body: some View {
        WebEditor(onExport: { exported = ExportedDocument(url: $0) })
            .ignoresSafeArea(.container, edges: .bottom)
            .sheet(item: $exported) { item in ShareDocument(url: item.url) }
    }
}
struct ShareDocument: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController { UIActivityViewController(activityItems: [url], applicationActivities: nil) }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
