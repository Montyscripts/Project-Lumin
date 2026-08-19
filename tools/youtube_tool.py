def youtube_search_and_play(query: str, play_first: bool = True) -> str:
    """
    Search YouTube for the given query and (optionally) open the first real video.
    Skips ads and Shorts. Uses a single Selenium session so context is never lost.
    """
    import time
    import urllib.parse
    import webbrowser

    # Try to import Selenium
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.common.exceptions import StaleElementReferenceException, TimeoutException
        SELENIUM_AVAILABLE = True
    except ImportError:
        SELENIUM_AVAILABLE = False

    search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query)}"

    # Fallback if Selenium is not available
    if not SELENIUM_AVAILABLE:
        webbrowser.open(search_url)
        return f'Selenium not available. Opened YouTube search for "{query}" in default browser.'

    driver = None
    try:
        # Create a fresh Chrome driver
        options = webdriver.ChromeOptions()
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-popup-blocking")
        # Uncomment the next line if you want it headless (no visible window)
        # options.add_argument("--headless=new")

        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(20)

        # Open the search results page
        driver.get(search_url)
        time.sleep(3)  # Let dynamic content settle

        if not play_first:
            title = driver.title or "YouTube Search"
            return f'Searched YouTube for "{query}". Page title: {title}'

        # Strict XPaths that skip ads and Shorts
        xpaths = [
            "//a[@id='video-title' and contains(@href, '/watch?v=')]",
            "//a[contains(@href, '/watch?v=') and not(ancestor::ytd-ad-slot-renderer) "
            "and not(ancestor::ytd-promoted-sparkles-web-renderer) "
            "and not(contains(@href, '/shorts/'))]",
        ]

        video_url = None
        for xp in xpaths:
            try:
                links = driver.find_elements(By.XPATH, xp)
                for link in links:
                    try:
                        if not link.is_displayed():
                            continue
                        href = link.get_attribute("href") or ""
                        if "/watch?v=" in href and "/shorts/" not in href:
                            video_url = href
                            break
                    except StaleElementReferenceException:
                        continue
                if video_url:
                    break
            except Exception:
                continue

        if not video_url:
            return f'Searched YouTube for "{query}" but could not find a clickable video.'

        # Navigate to the real video in the same session
        driver.get(video_url)
        time.sleep(2)

        # Try to click the big play button if it appears
        try:
            play_btn = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "button.ytp-large-play-button"))
            )
            play_btn.click()
        except (TimeoutException, Exception):
            pass  # Autoplay or already playing is fine

        title = driver.title or "Unknown title"
        return f'Searched YouTube for "{query}" and opened the first video: {title}'

    except Exception as e:
        # Fallback so the user still gets something useful
        webbrowser.open(search_url)
        return f'YouTube search for "{query}" opened in default browser (Selenium error: {e}).'

    finally:
        # Keep the browser open so the video can play.
        # If you want it to close automatically, uncomment the next two lines:
        # if driver:
        #     driver.quit()
        pass