package com.signalgenie.app;

import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class MainActivity extends BridgeActivity {

    private int selectedNavItemId = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);

        FrameLayout container = findViewById(R.id.webview_container);
        WebView webView = this.bridge.getWebView();
        // Bridge's WebView is already attached to a parent by Capacitor's own
        // setup; re-parent it into our layout's container instead of leaving
        // it in Capacitor's default full-screen placement.
        if (webView.getParent() != null) {
            ((ViewGroup) webView.getParent()).removeView(webView);
        }
        container.addView(webView);

        BottomNavigationView nav = findViewById(R.id.bottom_nav);
        selectedNavItemId = nav.getSelectedItemId();
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == selectedNavItemId) {
                // Already on this tab; avoid an unnecessary full-page reload/flash.
                return true;
            }

            String route;
            if (id == R.id.nav_home) route = "/dashboard";
            else if (id == R.id.nav_signals) route = "/dashboard/signals";
            else if (id == R.id.nav_portfolio) route = "/dashboard/portfolio";
            else if (id == R.id.nav_dividends) route = "/dashboard/dividends";
            else return false;

            selectedNavItemId = id;
            webView.evaluateJavascript("if(typeof window.__navigateTo==='function'){window.__navigateTo('" + route + "');}else{window.location.href='" + route + "';}", null);
            return true;
        });
    }
}
