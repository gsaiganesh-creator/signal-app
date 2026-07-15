import UIKit
import Capacitor

/// Native UITabBar chrome wrapping the single Capacitor WebView. Tapping a
/// tab does not swap view controllers — it posts a JS navigation event into
/// the existing bridge's webview, so there is exactly one WebView instance
/// for the app's lifetime (avoids reload flicker and keeps web-side state).
class ShellViewController: UIViewController, UITabBarDelegate {

    private let bridgeVC = CAPBridgeViewController()
    private let tabBar = UITabBar()
    private var selectedTag: Int = 0

    private let tabs: [(title: String, route: String, icon: String)] = [
        ("Home",      "/dashboard",         "house"),
        ("Signals",   "/dashboard/signals", "chart.line.uptrend.xyaxis"),
        ("Portfolio", "/dashboard/portfolio","briefcase"),
        ("Dividends", "/dashboard/dividends","banknote"),
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        addChild(bridgeVC)
        view.addSubview(bridgeVC.view)
        bridgeVC.didMove(toParent: self)

        tabBar.delegate = self
        tabBar.items = tabs.enumerated().map { i, t in
            let item = UITabBarItem(title: t.title, image: UIImage(systemName: t.icon), tag: i)
            return item
        }
        tabBar.selectedItem = tabBar.items?.first
        view.addSubview(tabBar)

        bridgeVC.view.translatesAutoresizingMaskIntoConstraints = false
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            bridgeVC.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            bridgeVC.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bridgeVC.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bridgeVC.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor),

            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard tabs.indices.contains(item.tag) else { return }
        guard item.tag != selectedTag else { return }
        selectedTag = item.tag
        let route = tabs[item.tag].route
        // Use Next.js client-side router (exposed by NativeNavBridge component) so
        // the app does NOT do a full page reload on tab tap. A hard location.href
        // change remounts BiometricLockGate and triggers Face ID on every tap.
        let js = "if(typeof window.__navigateTo==='function'){window.__navigateTo('\(route)');}else{window.location.href='\(route)';};"
        bridgeVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}
