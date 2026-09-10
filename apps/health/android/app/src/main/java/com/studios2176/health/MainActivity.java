package com.studios2176.health;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Publishes the window insets to CSS.
 *
 * Android 15 (API 35) draws every app edge to edge, so without this the status
 * bar sits on top of the header and the navigation buttons sit on top of the
 * footer. CSS env(safe-area-inset-*) is the standard answer, but Android
 * WebView reports it inconsistently, so the real measurements are pushed in as
 * custom properties and env() is left as the fallback for iOS and the browser.
 *
 * Insets are re-read on every change, which covers rotation, a three-button
 * bar switching to gesture navigation, and the keyboard opening.
 */
public class MainActivity extends BridgeActivity {

    private int[] lastInsets = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final View root = findViewById(android.R.id.content);

        ViewCompat.setOnApplyWindowInsetsListener(root, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout());

            float d = getResources().getDisplayMetrics().density;
            lastInsets = new int[] {
                Math.round(bars.top / d), Math.round(bars.bottom / d),
                Math.round(bars.left / d), Math.round(bars.right / d),
            };
            applySafeArea(lastInsets);

            // Not consumed: the WebView still wants them for its own handling.
            return windowInsets;
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        // The listener above can fire before the WebView has a document, in
        // which case the properties were set on nothing. Re-apply once the
        // page is certain to exist.
        if (lastInsets != null) {
            getBridge().getWebView().post(() -> applySafeArea(lastInsets));
        }
    }

    private void applySafeArea(int[] i) {
        int top = i[0], bottom = i[1], left = i[2], right = i[3];
        final String js =
            "(function(){var s=document.documentElement.style;"
            + "s.setProperty('--safe-top','" + top + "px');"
            + "s.setProperty('--safe-bottom','" + bottom + "px');"
            + "s.setProperty('--safe-left','" + left + "px');"
            + "s.setProperty('--safe-right','" + right + "px');})()";

        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        });
    }
}
