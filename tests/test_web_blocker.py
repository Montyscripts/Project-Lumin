"""
Unit tests for Web Blocker Simulation & Anti-Bot Security Challenge Detection.
Covers:
- HTTP 403 / 429 access restriction detection
- CAPTCHA & Cloudflare anti-bot challenge detection
- Access denied / rate limit phrase matching
- Login wall detection (password fields & sign-in prompts)
- Empty page content checks
- Clear page verification
"""

import unittest
from core.web_automation import detect_web_blocker


class TestWebBlockerSimulation(unittest.TestCase):
    def test_http_403_access_denied_detection(self):
        """detect_web_blocker detects HTTP 403 status code as access_denied blocker."""
        res = detect_web_blocker(
            url="https://example.com/protected",
            status_code=403,
            html_content="<h1>403 Forbidden</h1>"
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["blocker_type"], "access_denied")
        self.assertEqual(res["status"], "needs_user")
        self.assertIn("HTTP 403", res["title"])

    def test_http_429_rate_limit_detection(self):
        """detect_web_blocker detects HTTP 429 status code as rate_limit blocker."""
        res = detect_web_blocker(
            url="https://example.com/api",
            status_code=429,
            text_content="Too many requests. Please slow down."
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["blocker_type"], "rate_limit")
        self.assertEqual(res["status"], "failed")

    def test_cloudflare_and_captcha_challenge_detection(self):
        """detect_web_blocker detects Cloudflare turnstile, reCAPTCHA, and bot challenges."""
        test_cases = [
            ("Cloudflare Turnstile", "<div class='cf-turnstile'></div>", "Just a moment..."),
            ("reCAPTCHA", "<script src='https://www.google.com/recaptcha/api.js'></script>", "Verify you are human"),
            ("hCaptcha", "<div class='h-captcha' data-sitekey='123'></div>", "Security Check"),
            ("DataDome", "<title>DataDome Bot Protection</title>", "Pardon our interruption")
        ]

        for name, html_content, text_content in test_cases:
            res = detect_web_blocker(
                url="https://example.com/search",
                html_content=html_content,
                text_content=text_content
            )
            self.assertIsNotNone(res, f"Failed to detect blocker for {name}")
            self.assertEqual(res["blocker_type"], "captcha", f"Incorrect blocker type for {name}")
            self.assertEqual(res["status"], "needs_user")

    def test_access_denied_phrases_in_body(self):
        """detect_web_blocker identifies access denied phrases in HTML or page title."""
        res = detect_web_blocker(
            url="https://example.com/data",
            title="403 - Forbidden Access",
            text_content="You don't have permission to access this resource on this server."
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["blocker_type"], "access_denied")
        self.assertEqual(res["status"], "needs_user")

    def test_login_wall_detection(self):
        """detect_web_blocker identifies mandatory login forms and sign-in walls."""
        html_login = """
        <html>
            <head><title>Sign In Required</title></head>
            <body>
                <h2>Sign in to continue</h2>
                <form action="/login" method="POST">
                    <input type="text" name="username" />
                    <input type="password" name="password" />
                    <button type="submit">Log In</button>
                </form>
            </body>
        </html>
        """
        res = detect_web_blocker(
            url="https://example.com/dashboard",
            title="Sign In Required",
            html_content=html_login
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["blocker_type"], "login_required")
        self.assertEqual(res["status"], "needs_user")

    def test_empty_page_content_detection(self):
        """detect_web_blocker flags completely empty or whitespace-only pages."""
        res = detect_web_blocker(
            url="https://example.com/blank",
            html_content="   \n\t   ",
            text_content=""
        )
        self.assertIsNotNone(res)
        self.assertEqual(res["blocker_type"], "empty_content")

    def test_clear_page_returns_none(self):
        """detect_web_blocker returns None when page content is clean and accessible."""
        res = detect_web_blocker(
            url="https://example.com/article",
            status_code=200,
            title="Understanding Quantum Computing",
            html_content="<html><body><h1>Quantum Computing</h1><p>Quantum computing utilizes qubits...</p></body></html>",
            text_content="Quantum Computing. Quantum computing utilizes qubits..."
        )
        self.assertIsNone(res)


if __name__ == "__main__":
    unittest.main()
