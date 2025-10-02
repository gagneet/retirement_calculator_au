from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")
        # Click the accept button on the disclaimer modal
        page.click("#accept-disclaimer")
        # Wait for the modal to disappear
        page.wait_for_selector("#disclaimer-modal", state="hidden")
        page.screenshot(path="jules-scratch/verification/verification.png")
        browser.close()

run()