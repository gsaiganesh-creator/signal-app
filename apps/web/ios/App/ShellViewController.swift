import UIKit
import Capacitor

/// Native UITabBar chrome wrapping the single Capacitor WebView. Tapping a
/// tab does not swap view controllers — it posts a JS navigation event into
/// the existing bridge's webview, so there is exactly one WebView instance
/// for the app's lifetime (avoids reload flicker and keeps web-side state).
///
/// Styling mirrors the web dashboard's dark-theme "bento glossy" card
/// language (see apps/web/app/globals.css .dash-mobile-nav / --card-bg) —
/// rounded top corners, translucent navy blur, brand-blue active icon with
/// a rounded badge behind it. capacitor.config.ts commits the native shell
/// to the dark theme unconditionally (backgroundColor #070D1A everywhere),
/// so this bar is styled to match dark mode only, not theme-reactive.
class ShellViewController: UIViewController, UITabBarDelegate {

    private let bridgeVC = CAPBridgeViewController()
    private let tabBar = UITabBar()
    private var selectedTag: Int = 0
    private var urlObservation: NSKeyValueObservation?
    private var bridgeBottomToTabBar: NSLayoutConstraint!
    private var bridgeBottomToView: NSLayoutConstraint!

    private let tabs: [(title: String, route: String, icon: String)] = [
        ("Home",      "/dashboard",         "house"),
        ("Signals",   "/dashboard/signals", "chart.line.uptrend.xyaxis"),
        ("Portfolio", "/dashboard/portfolio","briefcase"),
        ("Dividends", "/dashboard/dividends","banknote"),
        ("More",      "/dashboard/more",    "ellipsis"),
    ]

    // var(--bluL) / var(--dim) / --card-bg dark stops / rgba(79,111,250,0.25) border
    // from apps/web/app/globals.css — kept in sync manually, same as
    // core/scan_log_writer.py's numeric port of lib/india-scan.ts.
    private let activeColor   = UIColor(red: 79/255,  green: 111/255, blue: 250/255, alpha: 1)
    private let inactiveColor = UIColor(red: 122/255, green: 139/255, blue: 170/255, alpha: 1)
    private let barTint       = UIColor(red: 13/255,  green: 25/255,  blue: 61/255,  alpha: 0.78)
    private let borderTint    = UIColor(red: 79/255,  green: 111/255, blue: 250/255, alpha: 0.25)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        addChild(bridgeVC)
        view.addSubview(bridgeVC.view)
        bridgeVC.didMove(toParent: self)

        tabBar.delegate = self
        tabBar.items = tabs.enumerated().map { i, t in
            UITabBarItem(title: t.title, image: UIImage(systemName: t.icon), tag: i)
        }
        tabBar.selectedItem = tabBar.items?.first
        styleTabBar()
        view.addSubview(tabBar)

        bridgeVC.view.translatesAutoresizingMaskIntoConstraints = false
        tabBar.translatesAutoresizingMaskIntoConstraints = false

        bridgeBottomToTabBar = bridgeVC.view.bottomAnchor.constraint(equalTo: tabBar.topAnchor)
        bridgeBottomToView   = bridgeVC.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)

        NSLayoutConstraint.activate([
            bridgeVC.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            bridgeVC.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bridgeVC.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            tabBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        // Tab bar has no business appearing before sign-in — the public
        // marketing site and /sign-in render through this same single
        // WebView, and this controller has no other signal about auth
        // state. Start hidden (bridgeBottomToView active) until the
        // webview's URL is observed to confirm we're actually in
        // /dashboard/*; observeWebViewURL() flips to bridgeBottomToTabBar
        // once that's true.
        bridgeBottomToView.isActive = true
        tabBar.isHidden = true

        observeWebViewURL()
    }

    /// Bridge/webView are created asynchronously by Capacitor — poll briefly
    /// until available rather than assuming it's ready right after addChild.
    private func observeWebViewURL(retriesLeft: Int = 10) {
        guard let webView = bridgeVC.bridge?.webView else {
            guard retriesLeft > 0 else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
                self?.observeWebViewURL(retriesLeft: retriesLeft - 1)
            }
            return
        }
        updateNavVisibility(for: webView.url)
        urlObservation = webView.observe(\.url, options: [.new]) { [weak self] webView, _ in
            DispatchQueue.main.async { self?.updateNavVisibility(for: webView.url) }
        }
    }

    private func updateNavVisibility(for url: URL?) {
        let showTabBar = url?.path.hasPrefix("/dashboard") ?? false
        guard tabBar.isHidden == showTabBar else { return }
        tabBar.isHidden = !showTabBar
        bridgeBottomToTabBar.isActive = showTabBar
        bridgeBottomToView.isActive = !showTabBar
        view.layoutIfNeeded()
    }

    private func styleTabBar() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemChromeMaterialDark)
        appearance.backgroundColor = barTint
        appearance.shadowColor = borderTint

        // Rounded badge behind the selected icon — same visual as the
        // 26x26 rgba(79,111,250,0.18) icon-badge on the web nav's active tab.
        appearance.stackedLayoutAppearance.selected.iconColor = activeColor
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: activeColor, .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
        ]
        appearance.stackedLayoutAppearance.normal.iconColor = inactiveColor
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: inactiveColor, .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
        ]

        tabBar.standardAppearance = appearance
        if #available(iOS 15.0, *) { tabBar.scrollEdgeAppearance = appearance }
        tabBar.selectionIndicatorImage = badgeImage(color: UIColor(red: 79/255, green: 111/255, blue: 250/255, alpha: 0.18), size: CGSize(width: 52, height: 32), cornerRadius: 10)

        tabBar.layer.cornerRadius = 20
        tabBar.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
        tabBar.clipsToBounds = true
        tabBar.layer.borderWidth = 1
        tabBar.layer.borderColor = borderTint.cgColor
    }

    private func badgeImage(color: UIColor, size: CGSize, cornerRadius: CGFloat) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            let path = UIBezierPath(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: cornerRadius)
            color.setFill()
            path.fill()
        }
    }

    func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard tabs.indices.contains(item.tag) else { return }
        guard item.tag != selectedTag else { return }
        selectedTag = item.tag
        let route = tabs[item.tag].route
        let js = "if(typeof window.__navigateTo==='function'){window.__navigateTo('\(route)');}else{window.location.href='\(route)';};"
        bridgeVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
    }
}
