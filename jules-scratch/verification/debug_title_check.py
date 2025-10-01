from playwright.sync_api import sync_playwright, Page, expect
import re

def run_debug_verification(page: Page):
    """
    This script performs the most basic check: navigates to the page
    and verifies its title to ensure the correct HTML is being served.
    """
    page.goto("http://localhost:8000")

    # Wait for the title to be correct
    expected_title = "Australian Retirement Calculator | Advanced Planning Tool with Super & Age Pension"
    expect(page).to_have_title(expected_title, timeout=15000)

    print(f"Successfully loaded page with title: '{page.title()}'")

    # Take a screenshot for visual confirmation
    page.screenshot(path="jules-scratch/verification/debug_title_check.png")
    print("Debug screenshot taken.")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_debug_verification(page)
        browser.close()

if __name__ == "__main__":
    main()