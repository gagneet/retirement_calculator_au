from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This script just loads the page and takes a screenshot for debugging.
    """
    page.goto("http://localhost:8000")
    page.wait_for_load_state("networkidle") # Wait for everything to settle
    page.screenshot(path="jules-scratch/verification/initial_page_view.png")
    print("Initial screenshot taken.")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()